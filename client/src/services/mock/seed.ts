import type {
  AnnouncementCategory,
  AnnouncementStatus,
  ChatMessage,
  Feedback,
  ISODate,
  Kpi,
  KpiAssignment,
  Position,
  SystemSettings,
  User,
} from '@/types';
import { addDays, getPeriodBounds, isSunday, todayISO } from '@/utils/date';
import { seededRandom } from './mockUtils';

/**
 * DEMO SEED DATA — fictional people, positions and "Sample KPIs".
 * Nothing here represents official Bank of Abyssinia KPIs, targets, thresholds or positions.
 */

export interface MockUser extends User {
  password: string;
  referenceId: string;
}

export type StoredKpi = Omit<Kpi, 'assignedStaffCount'>;

export interface StoredEntry {
  id: string;
  staffId: string;
  kpiId: string;
  date: ISODate;
  actual: number;
  target: number;
  note?: string;
  submittedAt: string;
  updatedAt: string;
}

export interface StoredAnnouncement {
  id: string;
  title: string;
  body: string;
  category: AnnouncementCategory;
  status: AnnouncementStatus;
  pinned: boolean;
  authorName: string;
  createdAt: string;
  publishedAt: string | null;
  readBy: string[];
}

export interface StoredConversation {
  id: string;
  type: 'branch' | 'direct';
  title: string;
  participantIds: string[];
  lastReadAt: Record<string, string>;
}

export interface MockDb {
  version: number;
  seededOn: ISODate;
  users: MockUser[];
  positions: Position[];
  kpis: StoredKpi[];
  assignments: KpiAssignment[];
  entries: StoredEntry[];
  feedback: Feedback[];
  announcements: StoredAnnouncement[];
  conversations: StoredConversation[];
  messages: ChatMessage[];
  settings: SystemSettings;
}

export const MOCK_DB_VERSION = 2;
export const DEMO_PASSWORD = 'Demo@1234';
const BRANCH = 'Demo Branch';

const iso = (date: ISODate, hour = 9, minute = 0) => {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d, hour, minute).toISOString();
};

export function createSeed(): MockDb {
  const today = todayISO();
  const rand = seededRandom(20261006);
  const created = iso(addDays(today, -200));

  const person = (
    id: string,
    employeeId: string,
    fullName: string,
    position: string,
    role: User['role'],
    status: User['status'],
    extra: Partial<MockUser> = {},
  ): MockUser => ({
    id,
    employeeId,
    fullName,
    email: `${fullName.split(' ')[0].toLowerCase()}.${fullName.split(' ')[1]?.toLowerCase() ?? 'user'}@example.com`,
    phone: `09${String(11000000 + Math.floor(rand() * 8999999)).slice(0, 8)}`,
    position,
    branchName: BRANCH,
    role,
    status,
    createdAt: created,
    approvedAt: status === 'active' || status === 'deactivated' ? created : null,
    rejectionReason: null,
    password: DEMO_PASSWORD,
    referenceId: extra.referenceId ?? (employeeId ? `REG-${employeeId}` : `REG-${id.replace('u_', '').toUpperCase()}-2026`),
    avatarUrl: extra.avatarUrl ?? null,
    emailVerified: status !== 'pending_email_verification',
    emailVerifiedAt: status !== 'pending_email_verification' ? created : null,
    ...extra,
  });

  const pos = (id: string, name: string, isActive = true): Position => ({
    id,
    name,
    isActive,
    createdAt: created,
    updatedAt: created,
  });

  const positions: Position[] = [
    pos('pos_cso', 'Customer Service Officer (demo)', true),
    pos('pos_ro', 'Relationship Officer (demo)', true),
    pos('pos_cash', 'Cash Officer (demo)', true),
    pos('pos_acct', 'Branch Accountant (demo)', true),
    pos('pos_clerk', 'Junior Banking Clerk (demo)', false),
  ];

  const users: MockUser[] = [
    person('u_mgr', 'BOA-M001', 'Mekdes Assefa', 'Branch Manager', 'manager', 'active'),
    person('u_s01', 'BOA-S001', 'Selam Tesfaye', 'Customer Service Officer (demo)', 'staff', 'active'),
    person('u_s02', 'BOA-S002', 'Dawit Bekele', 'Customer Service Officer (demo)', 'staff', 'active'),
    person('u_s03', 'BOA-S003', 'Hanna Girma', 'Cash Officer (demo)', 'staff', 'active'),
    person('u_s04', 'BOA-S004', 'Yonas Alemu', 'Cash Officer (demo)', 'staff', 'active'),
    person('u_s05', 'BOA-S005', 'Meron Haile', 'Relationship Officer (demo)', 'staff', 'active'),
    person('u_s06', 'BOA-S006', 'Biniam Tadesse', 'Relationship Officer (demo)', 'staff', 'active'),
    person('u_s07', 'BOA-S007', 'Liya Mekonnen', 'Customer Service Officer (demo)', 'staff', 'active'),
    person('u_s08', 'BOA-S008', 'Abel Worku', 'Cash Officer (demo)', 'staff', 'deactivated'),
    person('u_s09', '', 'Ruth Kebede', 'Customer Service Officer (demo)', 'staff', 'pending_approval', {
      createdAt: iso(addDays(today, -1), 15, 20),
      approvedAt: null,
      referenceId: 'REG-202610-S009',
    }),
    person('u_s10', '', 'Samuel Getachew', 'Cash Officer (demo)', 'staff', 'pending_approval', {
      createdAt: iso(today, 8, 5),
      approvedAt: null,
      referenceId: 'REG-202610-S010',
    }),
    person('u_s11', '', 'Elias Desta', 'Customer Service Officer (demo)', 'staff', 'pending_email_verification', {
      createdAt: iso(today, 9, 30),
      approvedAt: null,
      emailVerified: false,
      emailVerifiedAt: null,
      referenceId: 'REG-202610-S011',
    }),
  ];

  const kpi = (
    id: string,
    name: string,
    unit: string,
    valueType: Kpi['valueType'],
    target: number,
    frequency: Kpi['frequency'],
    isActive = true,
  ): StoredKpi => ({
    id,
    name,
    description: 'Placeholder KPI for interface demonstration. Replace with a KPI definition approved by branch management.',
    unit,
    valueType,
    target,
    frequency,
    weight: null,
    calculationRule: 'Conceptual example: (Actual ÷ Target) × 100 — pending approval.',
    ruleStatus: 'pending_validation',
    isActive,
    createdAt: created,
    updatedAt: created,
  });

  const kpis: StoredKpi[] = [
    kpi('k_a', 'Sample KPI A', 'items', 'integer', 10, 'daily'),
    kpi('k_b', 'Sample KPI B', 'ETB', 'currency', 50000, 'daily'),
    kpi('k_c', 'Sample KPI C', 'transactions', 'integer', 40, 'daily'),
    kpi('k_d', 'Sample KPI D', '%', 'percentage', 90, 'weekly'),
    kpi('k_e', 'Sample KPI E', 'items', 'integer', 5, 'monthly', false),
  ];

  // Assignment plan per staff (demo only)
  const plan: Record<string, string[]> = {
    u_s01: ['k_a', 'k_b', 'k_d'],
    u_s02: ['k_a', 'k_b', 'k_d'],
    u_s03: ['k_c', 'k_b', 'k_d'],
    u_s04: ['k_c', 'k_b'],
    u_s05: ['k_a', 'k_b', 'k_c', 'k_d'],
    u_s06: ['k_a', 'k_b', 'k_c'],
    u_s07: ['k_a', 'k_d'],
    u_s08: ['k_c'],
  };
  const assignments: KpiAssignment[] = [];
  for (const [staffId, kpiIds] of Object.entries(plan)) {
    for (const kpiId of kpiIds) {
      assignments.push({ id: `as_${staffId}_${kpiId}`, kpiId, staffId, targetOverride: null, assignedAt: created });
    }
  }

  // Historical entries — performance factor per staff gives varied, realistic-looking demo trends.
  const factor: Record<string, number> = {
    u_s01: 1.02, u_s02: 0.86, u_s03: 1.08, u_s04: 0.74, u_s05: 0.95, u_s06: 1.12, u_s07: 0.81,
  };
  const entries: StoredEntry[] = [];
  const DAYS = 130;
  for (const [staffId, kpiIds] of Object.entries(plan)) {
    if (!factor[staffId]) continue;
    for (const kpiId of kpiIds) {
      const def = kpis.find((k) => k.id === kpiId)!;
      const seenPeriods = new Set<string>();
      for (let i = DAYS; i >= 0; i--) {
        const date = addDays(today, -i);
        if (isSunday(date)) continue;
        // Leave today partially submitted to demonstrate "not submitted" states.
        if (i === 0 && ['u_s02', 'u_s04', 'u_s07'].includes(staffId)) continue;
        if (def.frequency !== 'daily') {
          const { start, end } = getPeriodBounds(def.frequency, date);
          // Record periodic KPIs once, on the last working day of the period (or today if current).
          if (seenPeriods.has(start)) continue;
          if (date !== end && !(end > today && date === today) && !(isSunday(end) && date === addDays(end, -1))) continue;
          seenPeriods.add(start);
        } else if (rand() > 0.94) {
          continue; // occasional missed entry
        }
        const drift = 1 + Math.sin((DAYS - i) / 18) * 0.06;
        const noise = 0.78 + rand() * 0.44;
        let actual = def.target * factor[staffId] * drift * noise;
        if (def.valueType === 'percentage') actual = Math.min(100, actual);
        actual = def.valueType === 'integer' ? Math.round(actual) : Math.round(actual * 100) / 100;
        if (def.valueType === 'currency') actual = Math.round(actual / 50) * 50;
        const at = iso(date, 16 + Math.floor(rand() * 2), Math.floor(rand() * 59));
        entries.push({ id: `e_${staffId}_${kpiId}_${date}`, staffId, kpiId, date, actual, target: def.target, submittedAt: at, updatedAt: at });
      }
    }
  }

  const fb = (id: string, staffId: string, daysAgo: number, subject: string, message: string, read: boolean, extra: Partial<Feedback> = {}): Feedback => {
    const staff = users.find((u) => u.id === staffId)!;
    const at = iso(addDays(today, -daysAgo), 11, 30);
    return {
      id, staffId, staffName: staff.fullName, managerId: 'u_mgr', managerName: 'Mekdes Assefa',
      subject, message, period: null, periodLabel: null, kpiId: null, kpiName: null,
      createdAt: at, readAt: read ? at : null, ...extra,
    };
  };

  const feedback: Feedback[] = [
    fb('f1', 'u_s01', 1, 'Consistent daily submissions', 'Thank you for submitting your KPI entries consistently this week. Keep it up, and let me know if anything blocks you.', false, { period: 'weekly', periodLabel: 'This week' }),
    fb('f2', 'u_s01', 9, 'Sample KPI B follow-up', 'Your results on Sample KPI B dipped mid-month. Let us review together during our next one-to-one.', true, { kpiId: 'k_b', kpiName: 'Sample KPI B', period: 'monthly', periodLabel: 'Last month' }),
    fb('f3', 'u_s04', 2, 'Support available', 'I noticed your recent results are below the demonstration target. Please schedule a short check-in so we can discuss support.', false, { period: 'weekly', periodLabel: 'This week' }),
    fb('f4', 'u_s06', 4, 'Strong quarter so far', 'Great progress this quarter. Please share your approach with the team at the next branch meeting.', true, { period: 'quarterly', periodLabel: 'This quarter' }),
    fb('f5', 'u_s02', 6, 'Missing entries', 'A few daily entries were missing last week. Please make sure entries are recorded before the end of each working day.', true, { period: 'weekly', periodLabel: 'Last week' }),
  ];

  const ann = (id: string, title: string, body: string, category: AnnouncementCategory, status: AnnouncementStatus, daysAgo: number, pinned = false, readBy: string[] = []): StoredAnnouncement => ({
    id, title, body, category, status, pinned, authorName: 'Mekdes Assefa',
    createdAt: iso(addDays(today, -daysAgo), 8, 15),
    publishedAt: status === 'draft' ? null : iso(addDays(today, -daysAgo), 8, 30),
    readBy,
  });

  const announcements: StoredAnnouncement[] = [
    ann('a1', 'Monthly branch staff meeting', 'All staff are invited to the monthly branch meeting this Friday at 5:30 PM in the conference room. We will review the month and upcoming priorities.\n\nPlease arrive on time.', 'meeting', 'published', 0, true),
    ann('a2', 'Using the new performance system', 'Please record your daily KPI entries in this system before the end of each working day. KPI definitions shown are samples until management confirms the official list.', 'notice', 'published', 3, false, ['u_s01']),
    ann('a3', 'Upcoming public holiday', 'The branch will follow the official public holiday schedule. Further details on opening hours will be shared closer to the date.', 'holiday', 'published', 8, false, ['u_s01', 'u_s02']),
    ann('a4', 'Welcome to our new colleagues', 'Please join me in welcoming new team members who joined the branch this month.', 'general', 'published', 15, false, ['u_s01', 'u_s03']),
    ann('a5', 'Quarterly review schedule (draft)', 'Draft schedule for quarterly one-to-one performance reviews. To be confirmed.', 'meeting', 'draft', 1),
    ann('a6', 'System maintenance window', 'The system was unavailable for scheduled maintenance last Saturday.', 'notice', 'archived', 40),
  ];

  const active = users.filter((u) => u.status === 'active');
  const conversations: StoredConversation[] = [
    { id: 'c_branch', type: 'branch', title: 'Branch General', participantIds: active.map((u) => u.id), lastReadAt: {} },
    { id: 'c_s01_mgr', type: 'direct', title: '', participantIds: ['u_s01', 'u_mgr'], lastReadAt: {} },
    { id: 'c_s01_s02', type: 'direct', title: '', participantIds: ['u_s01', 'u_s02'], lastReadAt: {} },
  ];

  const msg = (id: string, conversationId: string, senderId: string, body: string, minutesAgo: number): ChatMessage => ({
    id, conversationId, senderId, senderName: users.find((u) => u.id === senderId)!.fullName, body,
    sentAt: new Date(Date.now() - minutesAgo * 60_000).toISOString(),
  });

  const messages: ChatMessage[] = [
    msg('m1', 'c_branch', 'u_mgr', 'Good morning team. Reminder: monthly meeting on Friday at 5:30 PM.', 60 * 26),
    msg('m2', 'c_branch', 'u_s03', 'Noted, thank you.', 60 * 25),
    msg('m3', 'c_branch', 'u_s06', 'Will the meeting include the quarterly review schedule?', 60 * 3),
    msg('m4', 'c_branch', 'u_mgr', 'Yes, I will share the draft schedule there.', 60 * 2),
    msg('m5', 'c_s01_mgr', 'u_mgr', 'Hi Selam, could you stop by my office after lunch?', 95),
    msg('m6', 'c_s01_mgr', 'u_s01', 'Sure, I will be there at 2 PM.', 80),
    msg('m7', 'c_s01_s02', 'u_s02', 'Did you submit today\'s entries already?', 30),
  ];

  // Mark older messages as read for everyone so unread counts are meaningful.
  const readCutoff = new Date(Date.now() - 60 * 24 * 60_000).toISOString();
  for (const c of conversations) for (const p of c.participantIds) c.lastReadAt[p] = readCutoff;
  conversations[1].lastReadAt.u_s01 = new Date(Date.now() - 90 * 60_000).toISOString();

  const settings: SystemSettings = {
    branchName: BRANCH,
    branchCode: 'DEMO-001',
    // PLACEHOLDER thresholds for demonstration only — PENDING STAKEHOLDER VALIDATION (SRS §16.3, §29 Q9).
    thresholds: { onTargetMin: 100, needsAttentionMin: 80, status: 'pending_validation' },
    entryPolicy: { allowEditSubmitted: true, backdateDays: 3, status: 'pending_validation' },
    weightingEnabled: false,
  };

  return {
    version: MOCK_DB_VERSION,
    seededOn: today,
    users,
    positions,
    kpis,
    assignments,
    entries,
    feedback,
    announcements,
    conversations,
    messages,
    settings,
  };
}
