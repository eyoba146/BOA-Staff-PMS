import type { ISODateTime } from './common';

export type Role = 'staff' | 'manager';

export type AccountStatus =
  | 'pending_email_verification'
  | 'pending_approval'
  | 'active'
  | 'rejected'
  | 'deactivated';

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
  /** Whether the email address has been verified. */
  emailVerified?: boolean;
  /** Timestamp when email verification was completed. */
  emailVerifiedAt?: ISODateTime | null;
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
  email: string;
  employeeId: string;
  expiresInSeconds?: number;
  resendCooldownSeconds?: number;
  demoCode?: string;
}

export interface VerifyEmailRequest {
  employeeId: string;
  email?: string;
  code: string;
}

export interface VerifyEmailResponse {
  success: boolean;
  referenceId: string;
  status: AccountStatus;
  message: string;
}

export interface ResendEmailCodeRequest {
  employeeId: string;
  email?: string;
}

export interface ResendCodeResponse {
  success: boolean;
  expiresInSeconds: number;
  resendCooldownSeconds: number;
  demoCode?: string;
  message: string;
}

export interface PasswordResetRequestResponse {
  success: boolean;
  identifier: string;
  maskedEmail: string;
  expiresInSeconds: number;
  resendCooldownSeconds: number;
  demoCode?: string;
  message: string;
}

export interface VerifyResetCodeRequest {
  identifier: string;
  code: string;
}

export interface VerifyResetCodeResponse {
  success: boolean;
  resetToken: string;
  message: string;
}

export interface ResendResetCodeRequest {
  identifier: string;
}

export interface ResetPasswordRequest {
  identifier: string;
  resetToken: string;
  newPassword: string;
}

export interface AccountStatusResult {
  employeeId: string;
  fullName: string;
  email?: string;
  status: AccountStatus;
  referenceId: string;
  submittedAt: ISODateTime;
  decidedAt?: ISODateTime | null;
  rejectionReason?: string | null;
  emailVerified?: boolean;
  emailVerifiedAt?: ISODateTime | null;
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
