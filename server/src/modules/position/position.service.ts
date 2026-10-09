import { positionRepository, StoredPosition } from '../../repositories/position.repository.js';
import { ApiError } from '../../utils/apiError.js';

export const positionService = {
  async list(filter?: { activeOnly?: boolean; search?: string }): Promise<StoredPosition[]> {
    return positionRepository.list(filter);
  },

  async getById(id: string): Promise<StoredPosition> {
    const pos = await positionRepository.findById(id);
    if (!pos) {
      throw ApiError.notFound('Position not found');
    }
    return pos;
  },

  async create(name: string): Promise<StoredPosition> {
    const clean = name.trim();
    const existing = await positionRepository.findByName(clean);
    if (existing) {
      throw ApiError.conflict(`A position titled "${clean}" already exists`);
    }
    return positionRepository.create(clean);
  },

  async update(id: string, updates: { name?: string; isActive?: boolean }): Promise<StoredPosition> {
    const current = await positionRepository.findById(id);
    if (!current) {
      throw ApiError.notFound('Position not found');
    }

    if (updates.name && updates.name.trim().toLowerCase() !== current.name.toLowerCase()) {
      const duplicate = await positionRepository.findByName(updates.name.trim());
      if (duplicate && duplicate.id !== id) {
        throw ApiError.conflict(`A position titled "${updates.name.trim()}" already exists`);
      }
    }

    const updated = await positionRepository.update(id, updates);
    if (!updated) {
      throw ApiError.internal('Failed to update position');
    }
    return updated;
  },

  async setActive(id: string, isActive: boolean): Promise<StoredPosition> {
    const current = await positionRepository.findById(id);
    if (!current) {
      throw ApiError.notFound('Position not found');
    }
    const updated = await positionRepository.setActive(id, isActive);
    if (!updated) {
      throw ApiError.internal('Failed to set position status');
    }
    return updated;
  },
};
