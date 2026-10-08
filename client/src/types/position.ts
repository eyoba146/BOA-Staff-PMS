import type { ISODateTime } from './common';

/**
 * Managed branch position entity.
 * Official position list is managed dynamically by the Branch Manager.
 */
export interface Position {
  id: string;
  name: string;
  isActive: boolean;
  /** Calculated count of staff members holding this position (manager view). */
  assignedStaffCount?: number;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface CreatePositionRequest {
  name: string;
}

export interface UpdatePositionRequest {
  name?: string;
  isActive?: boolean;
}

export interface PositionFilterParams {
  activeOnly?: boolean;
  search?: string;
}
