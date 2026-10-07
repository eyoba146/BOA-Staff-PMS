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
    if (s.thresholds.needsAttentionMin >= s.thresholds.onTargetMin) {
      throw mockError(422, 'VALIDATION', 'Thresholds are inconsistent.', {
        needsAttentionMin: 'Must be lower than the "On target" minimum.',
      });
    }
    getDb().settings = clone(s);
    commit();
    return clone(s);
  },
  async resetDemoData() {
    await delay(300);
    requireManager();
    resetDb();
  },
};

export const settingsService: SettingsService = env.useMockApi ? mockSettingsService : httpSettingsService;
