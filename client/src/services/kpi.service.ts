import { env } from '@/config/env';
import type { AssignedKpi, ISODate, Kpi, KpiAssignment, KpiInput } from '@/types';
import { getPeriodBounds } from '@/utils/date';
import { api } from './http/apiClient';
import { activeAssignedKpis, toKpiEntry } from './mock/mockCalculations';
import { commit, getDb } from './mock/mockDb';
import { requireManager, requireUser } from './mock/mockGuards';
import { delay, mockError, nowISO, uid } from './mock/mockUtils';
import type { StoredKpi } from './mock/seed';

export interface KpiListParams {
  search?: string;
  status?: 'all' | 'active' | 'inactive';
}

export interface KpiService {
  list(params?: KpiListParams): Promise<Kpi[]>;
  getById(id: string): Promise<Kpi>;
  create(input: KpiInput): Promise<Kpi>;
  update(id: string, input: KpiInput): Promise<Kpi>;
  setActive(id: string, isActive: boolean): Promise<Kpi>;
  listAssignments(filter: { kpiId?: string; staffId?: string }): Promise<KpiAssignment[]>;
  /** Replace the full set of staff assigned to a KPI. */
  setAssignments(kpiId: string, staffIds: string[]): Promise<KpiAssignment[]>;
  /** KPIs assigned to the signed-in staff member, with any entry already recorded for `date`'s period. */
  getMyAssignedKpis(date: ISODate): Promise<AssignedKpi[]>;
}

// ---------------- HTTP adapter ----------------
const httpKpiService: KpiService = {
  list: (params) => api.get<Kpi[]>('/kpis', { search: params?.search, status: params?.status === 'all' ? undefined : params?.status }),
  getById: (id) => api.get<Kpi>(`/kpis/${id}`),
  create: (input) => api.post<Kpi>('/kpis', input),
  update: (id, input) => api.patch<Kpi>(`/kpis/${id}`, input),
  setActive: (id, isActive) => api.patch<Kpi>(`/kpis/${id}/status`, { isActive }),
  listAssignments: (filter) => api.get<KpiAssignment[]>('/kpi-assignments', filter),
  setAssignments: (kpiId, staffIds) => api.put<KpiAssignment[]>(`/kpis/${kpiId}/assignments`, { staffIds }),
  getMyAssignedKpis: (date) => api.get<AssignedKpi[]>('/kpis/assigned/me', { date }),
};

// ---------------- Mock adapter ----------------
function hydrate(k: StoredKpi): Kpi {
  const db = getDb();
  const assignedStaffCount = db.assignments.filter(
    (a) => a.kpiId === k.id && db.users.find((u) => u.id === a.staffId)?.status === 'active',
  ).length;
  return { ...k, assignedStaffCount };
}

function findKpi(id: string): StoredKpi {
  const kpi = getDb().kpis.find((k) => k.id === id);
  if (!kpi) throw mockError(404, 'NOT_FOUND', 'KPI not found.');
  return kpi;
}

function assertUniqueName(name: string, exceptId?: string) {
  if (getDb().kpis.some((k) => k.id !== exceptId && k.name.trim().toLowerCase() === name.trim().toLowerCase())) {
    throw mockError(409, 'CONFLICT', 'A KPI with this name already exists.', { name: 'A KPI with this name already exists.' });
  }
}

const mockKpiService: KpiService = {
  async list(params = {}) {
    await delay();
    requireManager();
    const q = params.search?.trim().toLowerCase();
    return getDb()
      .kpis.filter((k) => !params.status || params.status === 'all' || (params.status === 'active') === k.isActive)
      .filter((k) => !q || k.name.toLowerCase().includes(q) || k.description.toLowerCase().includes(q))
      .sort((a, b) => Number(b.isActive) - Number(a.isActive) || a.name.localeCompare(b.name))
      .map(hydrate);
  },
  async getById(id) {
    await delay();
    requireManager();
    return hydrate(findKpi(id));
  },
  async create(input) {
    await delay(450);
    requireManager();
    assertUniqueName(input.name);
    const now = nowISO();
    const kpi: StoredKpi = { ...input, id: uid('k'), createdAt: now, updatedAt: now };
    getDb().kpis.push(kpi);
    commit();
    return hydrate(kpi);
  },
  async update(id, input) {
    await delay(450);
    requireManager();
    assertUniqueName(input.name, id);
    const kpi = findKpi(id);
    Object.assign(kpi, input, { updatedAt: nowISO() });
    commit();
    return hydrate(kpi);
  },
  async setActive(id, isActive) {
    await delay(300);
    requireManager();
    const kpi = findKpi(id);
    kpi.isActive = isActive;
    kpi.updatedAt = nowISO();
    commit();
    return hydrate(kpi);
  },
  async listAssignments(filter) {
    await delay(200);
    requireManager();
    return getDb().assignments.filter(
      (a) => (!filter.kpiId || a.kpiId === filter.kpiId) && (!filter.staffId || a.staffId === filter.staffId),
    );
  },
  async setAssignments(kpiId, staffIds) {
    await delay(450);
    requireManager();
    findKpi(kpiId);
    const db = getDb();
    const keep = db.assignments.filter((a) => a.kpiId !== kpiId || staffIds.includes(a.staffId));
    const existing = new Set(keep.filter((a) => a.kpiId === kpiId).map((a) => a.staffId));
    for (const staffId of staffIds) {
      if (!existing.has(staffId)) keep.push({ id: uid('as'), kpiId, staffId, targetOverride: null, assignedAt: nowISO() });
    }
    db.assignments = keep;
    commit();
    return keep.filter((a) => a.kpiId === kpiId);
  },
  async getMyAssignedKpis(date) {
    await delay();
    const user = requireUser();
    const db = getDb();
    return activeAssignedKpis(db, user.id).map(({ kpi, target }) => {
      const bounds = getPeriodBounds(kpi.frequency, date);
      const stored = db.entries.find(
        (e) => e.staffId === user.id && e.kpiId === kpi.id && e.date >= bounds.start && e.date <= bounds.end,
      );
      return { kpi: hydrate(kpi), target, entry: stored ? toKpiEntry(stored, db) : null };
    });
  },
};

export const kpiService: KpiService = env.useMockApi ? mockKpiService : httpKpiService;
