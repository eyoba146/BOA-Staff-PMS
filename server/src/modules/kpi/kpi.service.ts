import { prisma } from '../../config/database.js';
import { ApiError } from '../../utils/apiError.js';
import { recordAuditLog } from '../audit/audit.service.js';
import { getPeriodBounds } from '../../utils/date.js';
import { entryPercent, statusFor } from '../../utils/calculations.js';
import { invalidateOverviewCache } from '../performance/performance.service.js';

interface CachedKpis {
  data: any;
  timestamp: number;
}
const kpisCache = new Map<string, CachedKpis>();
const KPIS_CACHE_TTL = 30000;

interface CachedMyAssigned {
  data: any;
  timestamp: number;
}
const myAssignedCache = new Map<string, CachedMyAssigned>();
const MY_ASSIGNED_TTL = 30000;

export function invalidateMyAssignedKpis(userId?: string) {
  if (userId) {
    for (const key of myAssignedCache.keys()) {
      if (key.startsWith(`${userId}_`)) {
        myAssignedCache.delete(key);
      }
    }
  } else {
    myAssignedCache.clear();
  }
}

export function invalidateKpisCache() {
  kpisCache.clear();
  myAssignedCache.clear();
}

export async function listKpis(params: { search?: string; status?: 'all' | 'active' | 'inactive' }) {
  const cacheKey = `${params.search ?? ''}_${params.status ?? 'all'}`;
  const cached = kpisCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < KPIS_CACHE_TTL) {
    return cached.data;
  }

  const where: any = {};
  if (params.status === 'active') {
    where.isActive = true;
  } else if (params.status === 'inactive') {
    where.isActive = false;
  }

  if (params.search?.trim()) {
    where.OR = [
      { name: { contains: params.search.trim(), mode: 'insensitive' } },
      { description: { contains: params.search.trim(), mode: 'insensitive' } },
    ];
  }

  const [kpis, activeAssignments] = await Promise.all([
    prisma.kpi.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.kpiAssignment.findMany({
      where: { staff: { status: 'active' } },
      select: { kpiId: true },
    }),
  ]);

  const countByKpiId = new Map<string, number>();
  for (const asgn of activeAssignments) {
    countByKpiId.set(asgn.kpiId, (countByKpiId.get(asgn.kpiId) ?? 0) + 1);
  }

  const result = kpis.map((k: any) => ({
    id: k.id,
    name: k.name,
    description: k.description,
    unit: k.unit,
    valueType: k.valueType,
    target: k.target,
    frequency: k.frequency,
    weight: k.weight,
    calculationRule: k.calculationRule,
    ruleStatus: k.ruleStatus,
    isActive: k.isActive,
    assignedStaffCount: countByKpiId.get(k.id) ?? 0,
    createdAt: k.createdAt.toISOString(),
    updatedAt: k.updatedAt.toISOString(),
  }));

  kpisCache.set(cacheKey, { data: result, timestamp: Date.now() });
  return result;
}

export async function getKpiById(id: string) {
  const k = await prisma.kpi.findUnique({
    where: { id },
    include: {
      assignments: {
        include: {
          staff: {
            select: { id: true, status: true },
          },
        },
      },
    },
  });

  if (!k) {
    throw ApiError.notFound('KPI not found.');
  }

  return {
    id: k.id,
    name: k.name,
    description: k.description,
    unit: k.unit,
    valueType: k.valueType,
    target: k.target,
    frequency: k.frequency,
    weight: k.weight,
    calculationRule: k.calculationRule,
    ruleStatus: k.ruleStatus,
    isActive: k.isActive,
    assignedStaffCount: k.assignments.filter((a: any) => a.staff?.status === 'active').length,
    createdAt: k.createdAt.toISOString(),
    updatedAt: k.updatedAt.toISOString(),
  };
}

export async function createKpi(data: any, managerId: string) {
  const existing = await prisma.kpi.findFirst({
    where: {
      name: { equals: data.name.trim(), mode: 'insensitive' },
    },
  });

  if (existing) {
    throw ApiError.conflict('A KPI with this name already exists.');
  }

  const kpi = await prisma.kpi.create({
    data: {
      name: data.name.trim(),
      description: data.description.trim(),
      unit: data.unit.trim(),
      valueType: data.valueType,
      target: Number(data.target),
      frequency: data.frequency,
      weight: data.weight !== undefined && data.weight !== null ? Number(data.weight) : null,
      calculationRule: data.calculationRule || null,
      ruleStatus: data.ruleStatus || 'pending_validation',
      isActive: data.isActive !== undefined ? data.isActive : true,
    },
  });

  await recordAuditLog({
    action: 'CREATE_KPI',
    actorId: managerId,
    details: `Created KPI "${kpi.name}" (target: ${kpi.target} ${kpi.unit})`,
  });

  invalidateOverviewCache();
  invalidateKpisCache();

  return getKpiById(kpi.id);
}

export async function updateKpi(id: string, data: any, managerId: string) {
  const existing = await prisma.kpi.findUnique({ where: { id } });
  if (!existing) {
    throw ApiError.notFound('KPI not found.');
  }

  if (data.name && data.name.trim().toLowerCase() !== existing.name.toLowerCase()) {
    const duplicate = await prisma.kpi.findFirst({
      where: {
        id: { not: id },
        name: { equals: data.name.trim(), mode: 'insensitive' },
      },
    });
    if (duplicate) {
      throw ApiError.conflict('A KPI with this name already exists.');
    }
  }

  const updated = await prisma.kpi.update({
    where: { id },
    data: {
      ...(data.name ? { name: data.name.trim() } : {}),
      ...(data.description !== undefined ? { description: data.description.trim() } : {}),
      ...(data.unit !== undefined ? { unit: data.unit.trim() } : {}),
      ...(data.valueType ? { valueType: data.valueType } : {}),
      ...(data.target !== undefined ? { target: Number(data.target) } : {}),
      ...(data.frequency ? { frequency: data.frequency } : {}),
      ...(data.weight !== undefined ? { weight: data.weight !== null ? Number(data.weight) : null } : {}),
      ...(data.calculationRule !== undefined ? { calculationRule: data.calculationRule } : {}),
      ...(data.ruleStatus ? { ruleStatus: data.ruleStatus } : {}),
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
    },
  });

  await recordAuditLog({
    action: 'UPDATE_KPI',
    actorId: managerId,
    details: `Updated KPI "${updated.name}"`,
  });

  invalidateOverviewCache();
  invalidateKpisCache();

  return getKpiById(updated.id);
}

export async function setKpiStatus(id: string, isActive: boolean, managerId: string) {
  return updateKpi(id, { isActive }, managerId);
}

export async function listAssignments(filter: { kpiId?: string; staffId?: string }) {
  const where: any = {};
  if (filter.kpiId) where.kpiId = filter.kpiId;
  if (filter.staffId) where.staffId = filter.staffId;

  const assignments = await prisma.kpiAssignment.findMany({
    where,
    orderBy: { assignedAt: 'desc' },
  });

  return assignments.map((a: any) => ({
    id: a.id,
    kpiId: a.kpiId,
    staffId: a.staffId,
    targetOverride: a.targetOverride,
    assignedAt: a.assignedAt.toISOString(),
  }));
}

export async function setKpiAssignments(kpiId: string, staffIds: string[], managerId: string) {
  const kpi = await prisma.kpi.findUnique({ where: { id: kpiId } });
  if (!kpi) {
    throw ApiError.notFound('KPI not found.');
  }

  // Transaction: delete removed assignments and add new ones
  await prisma.$transaction(async (tx: any) => {
    await tx.kpiAssignment.deleteMany({
      where: {
        kpiId,
        staffId: { notIn: staffIds },
      },
    });

    for (const staffId of staffIds) {
      const existing = await tx.kpiAssignment.findUnique({
        where: { kpiId_staffId: { kpiId, staffId } },
      });
      if (!existing) {
        await tx.kpiAssignment.create({
          data: { kpiId, staffId },
        });
      }
    }
  });

  await recordAuditLog({
    action: 'UPDATE_KPI_ASSIGNMENTS',
    actorId: managerId,
    details: `Updated assignments for KPI "${kpi.name}" (${staffIds.length} staff assigned)`,
  });

  invalidateOverviewCache();
  invalidateKpisCache();

  return listAssignments({ kpiId });
}

export async function getMyAssignedKpis(userId: string, date: string) {
  const cacheKey = `${userId}_${date}`;
  const cached = myAssignedCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < MY_ASSIGNED_TTL) {
    return cached.data;
  }

  const [assignments, settings] = await Promise.all([
    prisma.kpiAssignment.findMany({
      where: {
        staffId: userId,
        kpi: { isActive: true },
      },
      include: {
        kpi: true,
      },
    }),
    prisma.systemSettings.findUnique({ where: { id: 'default' } }),
  ]);

  if (assignments.length === 0) {
    myAssignedCache.set(cacheKey, { data: [], timestamp: Date.now() });
    return [];
  }

  const kpiIds = assignments.map((a: any) => a.kpiId);

  // Find minStart bound across all assigned KPIs
  let minStart = date;
  for (const asgn of assignments) {
    const b = getPeriodBounds(asgn.kpi.frequency as any, date);
    if (b.start < minStart) minStart = b.start;
  }

  // Fetch entries and active assignment counts in parallel single queries
  const [entries, activeStaffAssignments] = await Promise.all([
    prisma.kpiEntry.findMany({
      where: {
        staffId: userId,
        kpiId: { in: kpiIds },
        date: { gte: minStart, lte: date },
      },
      orderBy: { submittedAt: 'desc' },
    }),
    prisma.kpiAssignment.findMany({
      where: {
        kpiId: { in: kpiIds },
        staff: { status: 'active' },
      },
      select: { kpiId: true },
    }),
  ]);

  const countByKpiId = new Map<string, number>();
  for (const asgn of activeStaffAssignments) {
    countByKpiId.set(asgn.kpiId, (countByKpiId.get(asgn.kpiId) ?? 0) + 1);
  }

  const onTargetMin = settings?.onTargetMin ?? 85;
  const needsAttentionMin = settings?.needsAttentionMin ?? 70;

  const result = assignments.map((asgn: any) => {
    const kpi = asgn.kpi;
    const target = asgn.targetOverride ?? kpi.target;
    const bounds = getPeriodBounds(kpi.frequency as any, date);

    const entry = entries.find(
      (e: any) => e.kpiId === kpi.id && e.date >= bounds.start && e.date <= bounds.end,
    );

    const hydratedKpi = {
      id: kpi.id,
      name: kpi.name,
      description: kpi.description,
      unit: kpi.unit,
      valueType: kpi.valueType,
      target: kpi.target,
      frequency: kpi.frequency,
      weight: kpi.weight,
      calculationRule: kpi.calculationRule,
      ruleStatus: kpi.ruleStatus,
      isActive: kpi.isActive,
      assignedStaffCount: countByKpiId.get(kpi.id) ?? 0,
      createdAt: kpi.createdAt.toISOString(),
      updatedAt: kpi.updatedAt.toISOString(),
    };

    let formattedEntry = null;
    if (entry) {
      const pct = entryPercent(entry.actual, entry.target);
      formattedEntry = {
        id: entry.id,
        staffId: entry.staffId,
        kpiId: entry.kpiId,
        kpiName: kpi.name,
        unit: kpi.unit,
        valueType: kpi.valueType,
        date: entry.date,
        actual: entry.actual,
        target: entry.target,
        performancePercent: pct,
        status: statusFor(pct, onTargetMin, needsAttentionMin),
        note: entry.note,
        submittedAt: entry.submittedAt.toISOString(),
        updatedAt: entry.updatedAt.toISOString(),
      };
    }

    return {
      kpi: hydratedKpi,
      target,
      entry: formattedEntry,
    };
  });

  myAssignedCache.set(cacheKey, { data: result, timestamp: Date.now() });
  return result;
}

export async function deleteKpi(id: string, userId?: string, ipAddress?: string) {
  const existing = await prisma.kpi.findUnique({ where: { id } });
  if (!existing) {
    throw ApiError.notFound('KPI not found');
  }

  // Safely delete assignments and entries first
  await prisma.kpiAssignment.deleteMany({ where: { kpiId: id } });
  await prisma.kpiEntry.deleteMany({ where: { kpiId: id } });
  await prisma.feedback.updateMany({ where: { kpiId: id }, data: { kpiId: null } });

  await prisma.kpi.delete({ where: { id } });

  invalidateOverviewCache();
  invalidateKpisCache();

  if (userId) {
    await recordAuditLog({
      action: 'KPI_DELETED',
      actorId: userId,
      details: { kpiId: id, name: existing.name },
      ipAddress,
    });
  }
}
