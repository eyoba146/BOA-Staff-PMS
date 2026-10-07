import { env } from '@/config/env';
import type { DateRange, KpiEntry, KpiEntrySubmission } from '@/types';
import { diffInDays, getPeriodBounds, todayISO } from '@/utils/date';
import { api } from './http/apiClient';
import { activeAssignedKpis, toKpiEntry } from './mock/mockCalculations';
import { commit, getDb } from './mock/mockDb';
import { requireManager, requireUser } from './mock/mockGuards';
import { delay, mockError, nowISO, uid } from './mock/mockUtils';

export interface EntryQuery extends Partial<DateRange> {
  kpiId?: string;
}

export interface KpiEntryService {
  listMine(query?: EntryQuery): Promise<KpiEntry[]>;
  listForStaff(staffId: string, query?: EntryQuery): Promise<KpiEntry[]>;
  /** Submit (or update, if policy allows) actual achievements for a date. Returns saved entries with backend-calculated status. */
  submit(submission: KpiEntrySubmission): Promise<KpiEntry[]>;
}

// ---------------- HTTP adapter ----------------
const httpKpiEntryService: KpiEntryService = {
  listMine: (q) => api.get<KpiEntry[]>('/kpi-entries/me', { ...q }),
  listForStaff: (staffId, q) => api.get<KpiEntry[]>('/kpi-entries', { staffId, ...q }),
  submit: (s) => api.post<KpiEntry[]>('/kpi-entries', s),
};

// ---------------- Mock adapter ----------------
function query(staffId: string, q: EntryQuery = {}): KpiEntry[] {
  const db = getDb();
  return db.entries
    .filter((e) => e.staffId === staffId)
    .filter((e) => (!q.from || e.date >= q.from) && (!q.to || e.date <= q.to) && (!q.kpiId || e.kpiId === q.kpiId))
    .sort((a, b) => b.date.localeCompare(a.date) || a.kpiId.localeCompare(b.kpiId))
    .map((e) => toKpiEntry(e, db));
}

const mockKpiEntryService: KpiEntryService = {
  async listMine(q) {
    await delay();
    return query(requireUser().id, q);
  },
  async listForStaff(staffId, q) {
    await delay();
    requireManager();
    return query(staffId, q);
  },
  async submit({ date, entries }) {
    await delay(700);
    const user = requireUser();
    const db = getDb();
    const { entryPolicy } = db.settings;
    const today = todayISO();

    if (date > today) throw mockError(422, 'INVALID_DATE', 'Entries cannot be recorded for future dates.');
    if (diffInDays(today, date) > entryPolicy.backdateDays) {
      throw mockError(422, 'INVALID_DATE', `Entries can only be recorded up to ${entryPolicy.backdateDays} day(s) back.`);
    }

    const assigned = activeAssignedKpis(db, user.id);
    const fieldErrors: Record<string, string> = {};
    for (const item of entries) {
      if (!assigned.some((a) => a.kpi.id === item.kpiId)) fieldErrors[item.kpiId] = 'This KPI is not assigned to you.';
      else if (!Number.isFinite(item.actual) || item.actual < 0) fieldErrors[item.kpiId] = 'Enter a valid non-negative value.';
    }
    if (Object.keys(fieldErrors).length) throw mockError(422, 'VALIDATION', 'Some entries are invalid.', fieldErrors);

    const now = nowISO();
    const savedIds: string[] = [];
    for (const item of entries) {
      const { kpi, target } = assigned.find((a) => a.kpi.id === item.kpiId)!;
      const b = getPeriodBounds(kpi.frequency, date);
      const existing = db.entries.find((e) => e.staffId === user.id && e.kpiId === kpi.id && e.date >= b.start && e.date <= b.end);
      if (existing) {
        if (!entryPolicy.allowEditSubmitted) {
          throw mockError(409, 'ALREADY_SUBMITTED', `An entry for ${kpi.name} has already been submitted for this period.`);
        }
        Object.assign(existing, { actual: item.actual, note: item.note, updatedAt: now });
        savedIds.push(existing.id);
      } else {
        const id = uid('e');
        db.entries.push({ id, staffId: user.id, kpiId: kpi.id, date, actual: item.actual, target, note: item.note, submittedAt: now, updatedAt: now });
        savedIds.push(id);
      }
    }
    commit();
    return db.entries.filter((e) => savedIds.includes(e.id)).map((e) => toKpiEntry(e, db));
  },
};

export const kpiEntryService: KpiEntryService = env.useMockApi ? mockKpiEntryService : httpKpiEntryService;
