import { z } from 'zod';

export const loginSchema = z.object({
  identifier: z.string().min(1, 'Employee ID or email is required.'),
  password: z.string().min(1, 'Password is required.'),
  remember: z.boolean().optional().default(false),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required.'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters.')
    .regex(/[A-Z]/, 'Password must include an uppercase letter.')
    .regex(/[a-z]/, 'Password must include a lowercase letter.')
    .regex(/[0-9]/, 'Password must include a number.'),
});

export const registrationStatusSchema = z.object({
  employeeId: z.string().optional(),
  identifier: z.string().optional(),
});

export const registerSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters.'),
  position: z.string().trim().min(2, 'Please select a valid branch position.'),
  email: z.string().trim().email('Enter a valid email address.'),
  phone: z.string().trim().min(9, 'Enter a valid phone number.'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters.')
    .regex(/[A-Z]/, 'Password must include an uppercase letter.')
    .regex(/[a-z]/, 'Password must include a lowercase letter.')
    .regex(/[0-9]/, 'Password must include a number.'),
});

export const verifyEmailSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.'),
  code: z.string().trim().min(6, 'Verification code must be 6 digits.').max(6, 'Verification code must be 6 digits.'),
  employeeId: z.string().optional(),
});

export const resendEmailCodeSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.'),
  employeeId: z.string().optional(),
});

export const forgotPasswordSchema = z.object({
  identifier: z.string().trim().min(1, 'Employee ID or registered email is required.'),
});

export const verifyResetCodeSchema = z.object({
  identifier: z.string().trim().min(1, 'Employee ID or email is required.'),
  code: z.string().trim().min(6, 'Verification code must be 6 digits.').max(6, 'Verification code must be 6 digits.'),
});

export const resendResetCodeSchema = z.object({
  identifier: z.string().trim().min(1, 'Employee ID or email is required.'),
});

export const resetPasswordSchema = z.object({
  identifier: z.string().trim().min(1, 'Identifier is required.'),
  resetToken: z.string().trim().min(1, 'Reset token is required.'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters.')
    .regex(/[A-Z]/, 'Password must include an uppercase letter.')
    .regex(/[a-z]/, 'Password must include a lowercase letter.')
    .regex(/[0-9]/, 'Password must include a number.'),
});
