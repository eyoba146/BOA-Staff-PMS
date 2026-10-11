import { env } from '@/config/env';
import type { SystemSettings, User } from '@/types';
import { api } from './http/apiClient';
import { commit, getDb, resetDb } from './mock/mockDb';
import { requireManager, requireUser } from './mock/mockGuards';
import { clone, delay, mockError } from './mock/mockUtils';

export interface PublicSettings {
  branchName: string;
  branchCode: string;
}

export interface EmailChangeRequestResponse {
  success: boolean;
  message: string;
  expiresAt: string;
  resendAfter: string;
  serverTime: string;
}

export interface SettingsService {
  get(): Promise<SystemSettings>;
  update(settings: SystemSettings): Promise<SystemSettings>;
  getPublicSettings(): Promise<PublicSettings>;
  updateManagerProfile(data: { fullName: string }): Promise<User>;
  requestManagerEmailChange(data: { newEmail: string }): Promise<EmailChangeRequestResponse>;
  verifyManagerEmailChange(data: { newEmail: string; code: string }): Promise<{ success: boolean; message: string; user: User }>;
  /** Mock mode only: restore demo seed data. */
  resetDemoData?: () => Promise<void>;
}

// ---------------- HTTP adapter ----------------
const httpSettingsService: SettingsService = {
  get: () => api.get<SystemSettings>('/settings'),
  update: (s) => api.patch<SystemSettings>('/settings', s),
  getPublicSettings: () => api.get<PublicSettings>('/settings/public'),
  updateManagerProfile: (data) => api.patch<User>('/settings/manager-profile', data),
  requestManagerEmailChange: (data) => api.post<EmailChangeRequestResponse>('/settings/manager-email/request', data),
  verifyManagerEmailChange: (data) => api.post<{ success: boolean; message: string; user: User }>('/settings/manager-email/verify', data),
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
  async getPublicSettings() {
    await delay(100);
    const s = getDb().settings;
    return { branchName: s.branchName, branchCode: s.branchCode };
  },
  async updateManagerProfile(data) {
    await delay(300);
    requireManager();
    const db = getDb();
    const manager = db.users.find((u) => u.role === 'manager');
    if (!manager) throw mockError(404, 'NOT_FOUND', 'Manager not found.');
    manager.fullName = data.fullName.trim();
    commit();
    return clone(manager);
  },
  async requestManagerEmailChange(data) {
    await delay(300);
    requireManager();
    const now = new Date();
    return {
      success: true,
      message: `Verification code sent to ${data.newEmail}.`,
      expiresAt: new Date(now.getTime() + 300000).toISOString(),
      resendAfter: new Date(now.getTime() + 60000).toISOString(),
      serverTime: now.toISOString(),
    };
  },
  async verifyManagerEmailChange(data) {
    await delay(300);
    requireManager();
    const db = getDb();
    const manager = db.users.find((u) => u.role === 'manager');
    if (!manager) throw mockError(404, 'NOT_FOUND', 'Manager not found.');
    manager.email = data.newEmail.trim().toLowerCase();
    commit();
    return {
      success: true,
      message: 'Manager email address updated successfully.',
      user: clone(manager),
    };
  },
  async resetDemoData() {
    await delay(300);
    requireManager();
    resetDb();
  },
};

export const settingsService: SettingsService = env.useMockApi ? mockSettingsService : httpSettingsService;
