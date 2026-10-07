import { env } from '@/config/env';
import type { SystemSettings } from '@/types';
import { api } from './http/apiClient';
import { commit, getDb, resetDb } from './mock/mockDb';
import { requireManager, requireUser } from './mock/mockGuards';
import { clone, delay, mockError } from './mock/mockUtils';

export interface SettingsService {
  get(): Promise<SystemSettings>;
  update(settings: SystemSettings): Promise<SystemSettings>;
  /** Mock mode only: restore demo seed data. */
  resetDemoData?: () => Promise<void>;
}

// ---------------- HTTP adapter ----------------
const httpSettingsService: SettingsService = {
  get: () => api.get<SystemSettings>('/settings'),
  update: (s) => api.patch<SystemSettings>('/settings', s),
};

// ---------------- Mock adapter ----------------
const mockSettingsService: SettingsService = {
  async get() {
    await delay(150);
    requireUser();
    return clone(getDb().settings);
  },
  async update(s) {
    await delay(450);
    requireManager();
    const cleanBranchName = s.branchName?.trim();
    const cleanBranchCode = s.branchCode?.trim().toUpperCase();

    if (!cleanBranchName) {
      throw mockError(422, 'VALIDATION', 'Branch name is required.', {
        branchName: 'Branch name is required.',
      });
    }
    if (!cleanBranchCode) {
      throw mockError(422, 'VALIDATION', 'Branch code is required.', {
        branchCode: 'Branch code is required.',
      });
    }
    if (s.thresholds.needsAttentionMin >= s.thresholds.onTargetMin) {
      throw mockError(422, 'VALIDATION', 'Thresholds are inconsistent.', {
        needsAttentionMin: 'Must be lower than the "On target" minimum.',
      });
    }

    const updatedSettings: SystemSettings = {
      ...clone(s),
      branchName: cleanBranchName,
      branchCode: cleanBranchCode,
    };

    const db = getDb();
    db.settings = updatedSettings;

    // Propagate updated branchName to all users in the mock database
    for (const u of db.users) {
      u.branchName = cleanBranchName;
    }

    commit();
    return clone(updatedSettings);
  },
  async resetDemoData() {
    await delay(300);
    requireManager();
    resetDb();
  },
};

export const settingsService: SettingsService = env.useMockApi ? mockSettingsService : httpSettingsService;
