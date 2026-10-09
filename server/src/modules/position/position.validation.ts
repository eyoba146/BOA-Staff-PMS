import { z } from 'zod';

export const createPositionSchema = z.object({
  name: z.string().trim().min(2, 'Position title must be at least 2 characters'),
});

export const updatePositionSchema = z.object({
  name: z.string().trim().min(2, 'Position title must be at least 2 characters').optional(),
  isActive: z.boolean().optional(),
});

export const setPositionStatusSchema = z.object({
  isActive: z.boolean(),
});
