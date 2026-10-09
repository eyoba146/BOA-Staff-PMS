import { prisma } from '../../config/database.js';
import { ApiError } from '../../utils/apiError.js';
import { recordAuditLog } from '../audit/audit.service.js';
import { getPeriodBounds } from '../../utils/date.js';
import { entryPercent, statusFor } from '../../utils/calculations.js';

export async function listKpis(params: { search?: string; status?: 'all' | 'active' | 'inactive' }) {
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

  const kpis = await prisma.kpi.findMany({
    where,
    include: {
      assignments: {
        include: {
          staff: {
            select: { id: true, status: true },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return kpis.map((k: any) => ({
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
  }));
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

  return listAssignments({ kpiId });
}

export async function getMyAssignedKpis(userId: string, date: string) {
  const assignments = await prisma.kpiAssignment.findMany({
    where: {
      staffId: userId,
      kpi: { isActive: true },
    },
    include: {
      kpi: {
        include: {
          assignments: {
            include: { staff: { select: { id: true, status: true } } },
          },
        },
      },
    },
  });

  const settings = await prisma.systemSettings.findUnique({ where: { id: 'default' } });
  const onTargetMin = settings?.onTargetMin ?? 85;
  const needsAttentionMin = settings?.needsAttentionMin ?? 70;

  const result = [];
  for (const asgn of assignments) {
    const kpi = asgn.kpi;
    const target = asgn.targetOverride ?? kpi.target;
    const bounds = getPeriodBounds(kpi.frequency as any, date);

    const entry = await prisma.kpiEntry.findFirst({
      where: {
        staffId: userId,
        kpiId: kpi.id,
        date: { gte: bounds.start, lte: bounds.end },
      },
      orderBy: { submittedAt: 'desc' },
    });

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
      assignedStaffCount: kpi.assignments.filter((a: any) => a.staff?.status === 'active').length,
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

    result.push({
      kpi: hydratedKpi,
      target,
      entry: formattedEntry,
    });
  }

  return result;
}
