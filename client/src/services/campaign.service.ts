import { env } from '@/config/env';
import type { Campaign, CampaignInput, CampaignListResponse } from '@/types';
import { api } from './http/apiClient';
import { commit, getDb } from './mock/mockDb';
import { requireManager } from './mock/mockGuards';
import { delay, mockError, nowISO, uid } from './mock/mockUtils';

export interface CampaignService {
  list(filter?: { status?: string; type?: string }): Promise<CampaignListResponse>;
  getTypes(): Promise<string[]>;
  create(input: CampaignInput): Promise<Campaign>;
  update(id: string, input: Partial<CampaignInput>): Promise<Campaign>;
  delete(id: string): Promise<{ success: boolean; deletedId: string }>;
  exportExcel(): Promise<Blob>;
}

// ---------------- HTTP adapter ----------------
const httpCampaignService: CampaignService = {
  list: (filter) => api.get<CampaignListResponse>('/campaigns', { status: filter?.status, type: filter?.type }),
  getTypes: () => api.get<string[]>('/campaigns/types'),
  create: (input) => api.post<Campaign>('/campaigns', input),
  update: (id, input) => api.put<Campaign>(`/campaigns/${id}`, input),
  delete: (id) => api.delete<{ success: boolean; deletedId: string }>(`/campaigns/${id}`),
  exportExcel: async () => {
    const res = await fetch(`${env.apiBaseUrl}/campaigns/export`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('access_token') || ''}`,
      },
    });
    if (!res.ok) throw new Error('Failed to download campaign export.');
    return await res.blob();
  },
};

// ---------------- Mock adapter ----------------
const DEFAULT_TYPES = [
  'Deposit Mobilization',
  'Digital Banking & BOA Pay',
  'Remittance & Forex',
  'Loan Recovery',
  'Interest-Free Banking (IFB)',
  'Account Opening Drive',
];

const mockCampaigns: Campaign[] = [
  {
    id: 'camp_1',
    name: 'Q3 Branch Deposit Drive',
    type: 'Deposit Mobilization',
    target: 20000000,
    actual: 14500000,
    achievement: 72.5,
    status: 'in_progress',
    startDate: '2026-07-01',
    endDate: '2026-09-30',
    description: 'Branch-wide campaign to mobilize retail and commercial deposits.',
    managerId: 'u_mgr',
    manager: { fullName: 'Branch Manager', branchName: 'Finfine Main Branch' },
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
  },
  {
    id: 'camp_2',
    name: 'BOA Pay Merchant Onboarding',
    type: 'Digital Banking & BOA Pay',
    target: 150,
    actual: 112,
    achievement: 74.7,
    status: 'in_progress',
    startDate: '2026-08-01',
    endDate: '2026-10-31',
    description: 'Enrolling neighborhood retail merchants onto BOA Pay QR.',
    managerId: 'u_mgr',
    manager: { fullName: 'Branch Manager', branchName: 'Finfine Main Branch' },
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
  },
];

const mockCampaignService: CampaignService = {
  async list(filter = {}) {
    await delay(200);
    const db = getDb();
    if (!(db as any).campaigns) {
      (db as any).campaigns = [...mockCampaigns];
      commit();
    }
    let list: Campaign[] = (db as any).campaigns;
    if (filter.status && filter.status !== 'all') {
      list = list.filter((c) => c.status === filter.status);
    }
    if (filter.type && filter.type !== 'all') {
      list = list.filter((c) => c.type === filter.type);
    }

    const total = list.length;
    const inProgress = list.filter((c) => c.status === 'in_progress').length;
    const completed = list.filter((c) => c.status === 'completed').length;
    const planned = list.filter((c) => c.status === 'planned').length;
    const withActual = list.filter((c) => c.achievement !== null);
    const averageAchievement = withActual.length
      ? Math.round((withActual.reduce((s, c) => s + (c.achievement ?? 0), 0) / withActual.length) * 10) / 10
      : null;

    return {
      campaigns: list,
      summary: { total, inProgress, completed, planned, averageAchievement },
    };
  },
  async getTypes() {
    await delay(100);
    return DEFAULT_TYPES;
  },
  async create(input) {
    await delay(300);
    const manager = requireManager();
    const db = getDb();
    if (!(db as any).campaigns) (db as any).campaigns = [...mockCampaigns];

    const actual = input.actual !== undefined && input.actual !== null ? Number(input.actual) : null;
    const target = Number(input.target);
    const achievement = actual !== null && target > 0 ? Math.round((actual / target) * 1000) / 10 : null;

    const camp: Campaign = {
      id: uid('camp'),
      name: input.name.trim(),
      type: input.type.trim(),
      target,
      actual,
      achievement,
      status: input.status || 'planned',
      startDate: input.startDate,
      endDate: input.endDate,
      description: input.description || null,
      managerId: manager.id,
      manager: { fullName: manager.fullName, branchName: manager.branchName || 'Finfine Main Branch' },
      createdAt: nowISO(),
      updatedAt: nowISO(),
    };
    (db as any).campaigns.unshift(camp);
    commit();
    return camp;
  },
  async update(id, input) {
    await delay(300);
    requireManager();
    const db = getDb();
    const list: Campaign[] = (db as any).campaigns || [];
    const camp = list.find((c) => c.id === id);
    if (!camp) throw mockError(404, 'NOT_FOUND', 'Campaign not found.');

    if (input.name) camp.name = input.name.trim();
    if (input.type) camp.type = input.type.trim();
    if (input.target !== undefined) camp.target = Number(input.target);
    if (input.actual !== undefined) {
      camp.actual = input.actual === null ? null : Number(input.actual);
    }
    if (camp.actual !== null && camp.target > 0) {
      camp.achievement = Math.round((camp.actual / camp.target) * 1000) / 10;
    } else {
      camp.achievement = null;
    }
    if (input.startDate) camp.startDate = input.startDate;
    if (input.endDate) camp.endDate = input.endDate;
    if (input.status) camp.status = input.status;
    if (input.description !== undefined) camp.description = input.description;
    camp.updatedAt = nowISO();

    commit();
    return camp;
  },
  async delete(id) {
    await delay(200);
    requireManager();
    const db = getDb();
    if ((db as any).campaigns) {
      (db as any).campaigns = (db as any).campaigns.filter((c: any) => c.id !== id);
      commit();
    }
    return { success: true, deletedId: id };
  },
  async exportExcel() {
    await delay(200);
    const db = getDb();
    const list: Campaign[] = (db as any).campaigns || mockCampaigns;
    const header = 'Campaign Name,Campaign Type,Branch Target / Plan,Actual Result,Achievement (%),Status,Start Date,End Date\r\n';
    const lines = list
      .map(
        (c) =>
          `"${c.name}","${c.type}","${c.target}","${c.actual ?? 'Not entered'}","${c.achievement !== null ? `${c.achievement}%` : 'N/A'}","${c.status}","${c.startDate}","${c.endDate}"`
      )
      .join('\r\n');
    return new Blob(['\uFEFF' + header + lines], { type: 'text/csv;charset=utf-8' });
  },
};

export const campaignService: CampaignService = env.useMockApi ? mockCampaignService : httpCampaignService;
