import { prisma } from '../../config/database.js';
import { ApiError } from '../../utils/apiError.js';
import { recordAuditLog } from '../audit/audit.service.js';
import { todayISO, diffInDays } from '../../utils/date.js';
import { entryPercent, statusFor } from '../../utils/calculations.js';

export interface EntryFilter {
  staffId?: string;
  from?: string;
  to?: string;
  kpiId?: string;
}

export async function listEntries(filter: EntryFilter) {
  const where: any = {};
  if (filter.staffId) where.staffId = filter.staffId;
  if (filter.kpiId) where.kpiId = filter.kpiId;
  if (filter.from || filter.to) {
    where.date = {};
    if (filter.from) where.date.gte = filter.from;
    if (filter.to) where.date.lte = filter.to;
  }

  const entries = await prisma.kpiEntry.findMany({
    where,
    include: {
      kpi: true,
    },
    orderBy: [{ date: 'desc' }, { submittedAt: 'desc' }],
  });

  const settings = await prisma.systemSettings.findUnique({ where: { id: 'default' } });
  const onTargetMin = settings?.onTargetMin ?? 85;
  const needsAttentionMin = settings?.needsAttentionMin ?? 70;

  return entries.map((e: any) => {
    const pct = entryPercent(e.actual, e.target);
    return {
      id: e.id,
      staffId: e.staffId,
      kpiId: e.kpiId,
      kpiName: e.kpi?.name ?? 'Unknown KPI',
      unit: e.kpi?.unit ?? '',
      valueType: e.kpi?.valueType ?? 'decimal',
      date: e.date,
      actual: e.actual,
      target: e.target,
      performancePercent: pct,
      status: statusFor(pct, onTargetMin, needsAttentionMin),
      note: e.note,
      submittedAt: e.submittedAt.toISOString(),
      updatedAt: e.updatedAt.toISOString(),
    };
  });
}

export async function submitEntries(userId: string, date: string, entries: Array<{ kpiId: string; actual: number; note?: string }>) {
  const today = todayISO();
  if (date > today) {
    throw ApiError.badRequest('Entries cannot be recorded for future dates.');
  }

  const settings = await prisma.systemSettings.findUnique({ where: { id: 'default' } });
  const backdateDays = settings?.backdateDays ?? 3;
  const allowEdit = settings?.allowEditSubmitted ?? true;
  const onTargetMin = settings?.onTargetMin ?? 85;
  const needsAttentionMin = settings?.needsAttentionMin ?? 70;

  if (diffInDays(today, date) > backdateDays) {
    throw ApiError.badRequest(`Entries can only be recorded up to ${backdateDays} day(s) back.`);
  }

  const assignments = await prisma.kpiAssignment.findMany({
    where: { staffId: userId, kpi: { isActive: true } },
    include: { kpi: true },
  });

  const assignedMap = new Map<string, { kpi: any; target: number }>();
  for (const a of assignments) {
    assignedMap.set(a.kpiId, { kpi: a.kpi, target: a.targetOverride ?? a.kpi.target });
  }

  const savedEntries: any[] = [];

  for (const item of entries) {
    const assigned = assignedMap.get(item.kpiId);
    if (!assigned) {
      continue; // Skip KPIs not assigned to this user
    }

    const target = assigned.target;
    const actual = Number(item.actual);
    const pct = entryPercent(actual, target);
    const status = statusFor(pct, onTargetMin, needsAttentionMin);

    const existing = await prisma.kpiEntry.findUnique({
      where: {
        staffId_kpiId_date: {
          staffId: userId,
          kpiId: item.kpiId,
          date,
        },
      },
    });

    if (existing && !allowEdit) {
      throw ApiError.badRequest('Editing previously submitted entries is not allowed by branch policy.');
    }

    const saved = await prisma.kpiEntry.upsert({
      where: {
        staffId_kpiId_date: {
          staffId: userId,
          kpiId: item.kpiId,
          date,
        },
      },
      update: {
        actual,
        target,
        performancePercent: pct,
        status: status as any,
        note: item.note?.trim() || null,
      },
      create: {
        staffId: userId,
        kpiId: item.kpiId,
        date,
        actual,
        target,
        performancePercent: pct,
        status: status as any,
        note: item.note?.trim() || null,
      },
      include: {
        kpi: true,
      },
    });

    savedEntries.push({
      id: saved.id,
      staffId: saved.staffId,
      kpiId: saved.kpiId,
      kpiName: saved.kpi.name,
      unit: saved.kpi.unit,
      valueType: saved.kpi.valueType,
      date: saved.date,
      actual: saved.actual,
      target: saved.target,
      performancePercent: pct,
      status,
      note: saved.note,
      submittedAt: saved.submittedAt.toISOString(),
      updatedAt: saved.updatedAt.toISOString(),
    });
  }

  await recordAuditLog({
    action: 'SUBMIT_KPI_ENTRIES',
    actorId: userId,
    details: `Recorded ${savedEntries.length} KPI entry record(s) for operational date ${date}`,
  });

  return savedEntries;
}
