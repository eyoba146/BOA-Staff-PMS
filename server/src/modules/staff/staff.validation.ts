import { z } from 'zod';

export const ethiopianPhoneRegex = /^(\+251[79]\d{8}|251[79]\d{8}|0[79]\d{8})$/;

export const phoneSchema = z
  .string()
  .trim()
  .refine(
    (val) => {
      if (!val) return true;
      const clean = val.replace(/[\s\-()]/g, '');
      return ethiopianPhoneRegex.test(clean);
    },
    {
      message:
        'Phone number must start with +251 9, +251 7, 09, or 07 (10 digits for 09/07, or +251 with 9 digits).',
    },
  );

export const approveStaffSchema = z.object({
  employeeId: z.string().trim().min(2, 'Official Employee ID must be at least 2 characters.').optional(),
  kpiIds: z.array(z.string()).optional(),
});

export const rejectStaffSchema = z.object({
  reason: z.string().trim().min(3, 'Rejection reason must be at least 3 characters.'),
});

export const setStaffStatusSchema = z.object({
  status: z.enum(['active', 'deactivated']),
});

export const updateProfileSchema = z.object({
  phone: phoneSchema.optional(),
  avatarUrl: z.string().nullable().optional(),
});

export const staffEmailChangeRequestSchema = z.object({
  newEmail: z.string().trim().email('Enter a valid corporate email address.'),
});

export const staffEmailChangeVerifySchema = z.object({
  newEmail: z.string().trim().email('Enter a valid corporate email address.'),
  code: z.string().trim().length(6, 'Verification code must be exactly 6 digits.'),
});
