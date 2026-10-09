import { z } from 'zod';

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
  email: z.string().trim().email('Enter a valid email address.').optional(),
  phone: z.string().trim().min(9, 'Enter a valid phone number.').optional(),
  avatarUrl: z.string().nullable().optional(),
});
