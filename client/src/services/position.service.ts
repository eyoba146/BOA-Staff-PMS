import { env } from '@/config/env';
import type {
  CreatePositionRequest,
  Position,
  PositionFilterParams,
  UpdatePositionRequest,
} from '@/types';
import { api } from './http/apiClient';
import { commit, getDb } from './mock/mockDb';
import { requireManager } from './mock/mockGuards';
import { delay, mockError, nowISO, uid } from './mock/mockUtils';

export interface PositionService {
  list(params?: PositionFilterParams): Promise<Position[]>;
  getById(id: string): Promise<Position>;
  create(req: CreatePositionRequest): Promise<Position>;
  update(id: string, req: UpdatePositionRequest): Promise<Position>;
  setActive(id: string, isActive: boolean): Promise<Position>;
}

// ---------------- HTTP adapter ----------------
const httpPositionService: PositionService = {
  list: (params) =>
    api.get<Position[]>('/positions', {
      activeOnly: params?.activeOnly ? 'true' : undefined,
      search: params?.search,
    }),
  getById: (id) => api.get<Position>(`/positions/${id}`),
  create: (req) => api.post<Position>('/positions', req),
  update: (id, req) => api.patch<Position>(`/positions/${id}`, req),
  setActive: (id, isActive) => api.patch<Position>(`/positions/${id}/status`, { isActive }),
};

// ---------------- Mock adapter ----------------
const mockPositionService: PositionService = {
  async list(params = {}) {
    await delay(120);
    const db = getDb();
    const positions = db.positions ?? [];
    const q = params.search?.trim().toLowerCase();

    return positions
      .filter((p) => (params.activeOnly ? p.isActive : true))
      .filter((p) => (!q ? true : p.name.toLowerCase().includes(q)))
      .map((p) => ({
        ...p,
        assignedStaffCount: (db.users ?? []).filter(
          (u) =>
            u.role === 'staff' &&
            u.position?.toLowerCase() === p.name.toLowerCase() &&
            u.status !== 'pending_email_verification',
        ).length,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  },

  async getById(id) {
    await delay(100);
    const db = getDb();
    const pos = (db.positions ?? []).find((p) => p.id === id);
    if (!pos) throw mockError(404, 'NOT_FOUND', 'Position not found.');

    return {
      ...pos,
      assignedStaffCount: (db.users ?? []).filter(
        (u) =>
          u.role === 'staff' &&
          u.position?.toLowerCase() === pos.name.toLowerCase() &&
          u.status !== 'pending_email_verification',
      ).length,
    };
  },

  async create({ name }) {
    await delay(300);
    requireManager();
    const cleanName = name.trim();
    if (!cleanName) {
      throw mockError(422, 'VALIDATION', 'Position title is required.');
    }
    if (cleanName.length < 2) {
      throw mockError(422, 'VALIDATION', 'Position title must be at least 2 characters.');
    }

    const db = getDb();
    if (!db.positions) db.positions = [];

    const duplicate = db.positions.find((p) => p.name.toLowerCase() === cleanName.toLowerCase());
    if (duplicate) {
      throw mockError(409, 'DUPLICATE_NAME', `A position titled "${cleanName}" already exists.`);
    }

    const newPosition: Position = {
      id: uid('pos'),
      name: cleanName,
      isActive: true,
      createdAt: nowISO(),
      updatedAt: nowISO(),
    };

    db.positions.push(newPosition);
    commit();

    return { ...newPosition, assignedStaffCount: 0 };
  },

  async update(id, req) {
    await delay(300);
    requireManager();
    const db = getDb();
    if (!db.positions) db.positions = [];

    const pos = db.positions.find((p) => p.id === id);
    if (!pos) throw mockError(404, 'NOT_FOUND', 'Position not found.');

    if (req.name !== undefined) {
      const cleanName = req.name.trim();
      if (!cleanName) {
        throw mockError(422, 'VALIDATION', 'Position title is required.');
      }
      if (cleanName.length < 2) {
        throw mockError(422, 'VALIDATION', 'Position title must be at least 2 characters.');
      }

      const duplicate = db.positions.find(
        (p) => p.id !== id && p.name.toLowerCase() === cleanName.toLowerCase(),
      );
      if (duplicate) {
        throw mockError(409, 'DUPLICATE_NAME', `Another position titled "${cleanName}" already exists.`);
      }

      pos.name = cleanName;
    }

    if (req.isActive !== undefined) {
      pos.isActive = req.isActive;
    }

    pos.updatedAt = nowISO();
    commit();

    return {
      ...pos,
      assignedStaffCount: (db.users ?? []).filter(
        (u) =>
          u.role === 'staff' &&
          u.position?.toLowerCase() === pos.name.toLowerCase() &&
          u.status !== 'pending_email_verification',
      ).length,
    };
  },

  async setActive(id, isActive) {
    return this.update(id, { isActive });
  },
};

export const positionService: PositionService = env.useMockApi
  ? mockPositionService
  : httpPositionService;
