import { prisma } from '../../config/database.js';
import { ApiError } from '../../utils/apiError.js';
import { todayISO } from '../../utils/date.js';
import { recordAuditLog } from '../audit/audit.service.js';

export type CampaignStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled';

const DEFAULT_CAMPAIGN_TYPES = [
  'Deposit Mobilization',
  'Digital Banking & BOA Pay',
  'Remittance & Forex',
  'Loan Recovery',
  'Interest-Free Banking (IFB)',
  'Account Opening Drive',
];

export function calculateCampaignAchievement(actual: number | null | undefined, target: number): number | null {
  if (actual === null || actual === undefined || isNaN(actual)) {
    return null;
  }
  if (!target || isNaN(target) || target <= 0) {
    return 0;
  }
  return Math.round((actual / target) * 1000) / 10; // e.g. 72.5
}

export function deriveCampaignStatus(
  explicitStatus: string | undefined,
  startDate: string,
  endDate: string
): CampaignStatus {
  if (explicitStatus && ['planned', 'in_progress', 'completed', 'cancelled'].includes(explicitStatus)) {
    return explicitStatus as CampaignStatus;
  }
  const today = todayISO();
  if (today < startDate) return 'planned';
  if (today <= endDate) return 'in_progress';
  return 'completed';
}

export async function getCampaignTypes() {
  let types = await prisma.campaignType.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  });

  if (types.length === 0) {
    // Seed defaults if empty
    for (const name of DEFAULT_CAMPAIGN_TYPES) {
      await prisma.campaignType.upsert({
        where: { name },
        create: { name },
        update: {},
      });
    }
    types = await prisma.campaignType.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  return types.map((t: any) => t.name);
}

export async function ensureCampaignTypeExists(typeName: string) {
  const trimmed = typeName.trim();
  if (!trimmed) return;
  await prisma.campaignType.upsert({
    where: { name: trimmed },
    create: { name: trimmed },
    update: { isActive: true },
  });
}

export interface CreateCampaignInput {
  name: string;
  type: string;
  target: number;
  actual?: number | null;
  startDate: string;
  endDate: string;
  status?: CampaignStatus;
  description?: string;
}

export async function createCampaign(managerId: string, input: CreateCampaignInput) {
  const name = input.name?.trim();
  const type = input.type?.trim();
  const target = Number(input.target);
  const actual = input.actual !== undefined && input.actual !== null && input.actual !== ('' as any)
    ? Number(input.actual)
    : null;
  const startDate = input.startDate?.trim();
  const endDate = input.endDate?.trim();

  if (!name) throw ApiError.badRequest('Campaign name is required.');
  if (!type) throw ApiError.badRequest('Campaign type is required.');
  if (isNaN(target) || target <= 0) throw ApiError.badRequest('Target must be a positive number.');
  if (!startDate || !endDate) throw ApiError.badRequest('Start and end dates are required.');
  if (endDate < startDate) throw ApiError.badRequest('End date cannot precede start date.');
  if (actual !== null && (isNaN(actual) || actual < 0)) throw ApiError.badRequest('Actual result must be a non-negative number.');

  await ensureCampaignTypeExists(type);

  const achievement = calculateCampaignAchievement(actual, target);
  const status = deriveCampaignStatus(input.status, startDate, endDate);

  const campaign = await prisma.campaign.create({
    data: {
      name,
      type,
      target,
      actual,
      achievement,
      status,
      startDate,
      endDate,
      description: input.description?.trim() || null,
      managerId,
    },
    include: {
      manager: { select: { fullName: true, branchName: true } },
    },
  });

  await recordAuditLog({
    action: 'CREATE_CAMPAIGN',
    actorId: managerId,
    details: `Created campaign "${name}" (${type}, Target: ${target.toLocaleString()}, Status: ${status})`,
  });

  return campaign;
}

export async function updateCampaign(id: string, managerId: string, input: Partial<CreateCampaignInput>) {
  const existing = await prisma.campaign.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound('Campaign not found.');

  const name = input.name !== undefined ? input.name.trim() : existing.name;
  const type = input.type !== undefined ? input.type.trim() : existing.type;
  const target = input.target !== undefined ? Number(input.target) : existing.target;
  const actual = input.actual !== undefined
    ? input.actual === null || input.actual === ('' as any)
      ? null
      : Number(input.actual)
    : existing.actual;
  const startDate = input.startDate !== undefined ? input.startDate.trim() : existing.startDate;
  const endDate = input.endDate !== undefined ? input.endDate.trim() : existing.endDate;
  const status = (input.status || existing.status) as CampaignStatus;
  const description = input.description !== undefined ? input.description.trim() || null : existing.description;

  if (!name) throw ApiError.badRequest('Campaign name cannot be empty.');
  if (!type) throw ApiError.badRequest('Campaign type cannot be empty.');
  if (isNaN(target) || target <= 0) throw ApiError.badRequest('Target must be a positive number.');
  if (endDate < startDate) throw ApiError.badRequest('End date cannot precede start date.');
  if (actual !== null && (isNaN(actual) || actual < 0)) throw ApiError.badRequest('Actual result must be non-negative.');

  if (type) await ensureCampaignTypeExists(type);

  const achievement = calculateCampaignAchievement(actual, target);

  const updated = await prisma.campaign.update({
    where: { id },
    data: {
      name,
      type,
      target,
      actual,
      achievement,
      status,
      startDate,
      endDate,
      description,
    },
    include: {
      manager: { select: { fullName: true, branchName: true } },
    },
  });

  await recordAuditLog({
    action: 'UPDATE_CAMPAIGN',
    actorId: managerId,
    details: `Updated campaign "${name}" (Target: ${target.toLocaleString()}, Actual: ${actual ?? 'N/A'}, Achievement: ${achievement ?? 'N/A'}%)`,
  });

  return updated;
}

export async function deleteCampaign(id: string, managerId: string) {
  const existing = await prisma.campaign.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound('Campaign not found.');

  await prisma.campaign.delete({ where: { id } });

  await recordAuditLog({
    action: 'DELETE_CAMPAIGN',
    actorId: managerId,
    details: `Deleted campaign "${existing.name}" (${existing.type})`,
  });

  return { success: true, deletedId: id };
}

export async function listCampaigns(filters?: { status?: string; type?: string }) {
  const where: any = {};
  if (filters?.status && filters.status !== 'all') {
    where.status = filters.status;
  }
  if (filters?.type && filters.type !== 'all') {
    where.type = filters.type;
  }

  const campaigns = await prisma.campaign.findMany({
    where,
    orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
    include: {
      manager: { select: { fullName: true, branchName: true } },
    },
  });

  // Calculate summary statistics
  const total = campaigns.length;
  const inProgress = campaigns.filter((c: any) => c.status === 'in_progress').length;
  const completed = campaigns.filter((c: any) => c.status === 'completed').length;
  const planned = campaigns.filter((c: any) => c.status === 'planned').length;

  const campaignsWithActual = campaigns.filter((c: any) => c.achievement !== null);
  const averageAchievement = campaignsWithActual.length > 0
    ? Math.round(
        (campaignsWithActual.reduce((acc: number, c: any) => acc + (c.achievement ?? 0), 0) /
          campaignsWithActual.length) * 10
      ) / 10
    : null;

  return {
    campaigns,
    summary: {
      total,
      inProgress,
      completed,
      planned,
      averageAchievement,
    },
  };
}

export async function generateCampaignExportData() {
  const campaigns = await prisma.campaign.findMany({
    orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
    include: {
      manager: { select: { fullName: true, branchName: true } },
    },
  });

  // Generate Excel-compatible CSV with UTF-8 BOM
  const headers = [
    'Campaign Name',
    'Campaign Type',
    'Branch Target / Plan',
    'Actual Result',
    'Achievement (%)',
    'Status',
    'Start Date',
    'End Date',
    'Branch',
    'Manager',
    'Description',
  ];

  const escapeCsv = (val: any) => {
    if (val === null || val === undefined) return '';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = campaigns.map((c: any) => [
    escapeCsv(c.name),
    escapeCsv(c.type),
    escapeCsv(c.target),
    escapeCsv(c.actual !== null ? c.actual : 'Not entered'),
    escapeCsv(c.achievement !== null ? `${c.achievement}%` : 'N/A'),
    escapeCsv(c.status),
    escapeCsv(c.startDate),
    escapeCsv(c.endDate),
    escapeCsv(c.manager?.branchName || 'Finfine Main Branch'),
    escapeCsv(c.manager?.fullName || 'Branch Manager'),
    escapeCsv(c.description || ''),
  ]);

  const csvContent = '\uFEFF' + [headers.map((h) => `"${h}"`).join(','), ...rows.map((r: any) => r.join(','))].join('\r\n');
  return csvContent;
}
