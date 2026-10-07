import type { ISODateTime } from './common';

export type Role = 'staff' | 'manager';

export type AccountStatus = 'pending_approval' | 'active' | 'rejected' | 'deactivated';

export interface User {
  id: string;
  employeeId: string;
  fullName: string;
  email: string;
  phone: string;
  /** Position title. Official position list is PENDING STAKEHOLDER VALIDATION (SRS §29 Q1). */
  position: string;
  branchName: string;
  role: Role;
  status: AccountStatus;
  createdAt: ISODateTime;
  approvedAt?: ISODateTime | null;
  rejectionReason?: string | null;
  /** Number of KPIs currently assigned (manager views). */
  assignedKpiCount?: number;
  /** Data URL or remote URL for staff profile picture. */
  avatarUrl?: string | null;
}

export interface LoginRequest {
  identifier: string;
  password: string;
  remember: boolean;
}

export interface LoginResponse {
  user: User;
  accessToken: string;
}

export interface RegisterRequest {
  fullName: string;
  employeeId: string;
  position: string;
  email: string;
  phone: string;
  password: string;
}

export interface RegisterResponse {
  referenceId: string;
  status: AccountStatus;
}

export interface AccountStatusResult {
  employeeId: string;
  fullName: string;
  status: AccountStatus;
  referenceId: string;
  submittedAt: ISODateTime;
  decidedAt?: ISODateTime | null;
  rejectionReason?: string | null;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface UpdateProfileRequest {
  email?: string;
  phone?: string;
  avatarUrl?: string | null;
}
