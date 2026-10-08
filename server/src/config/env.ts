import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  CLIENT_URL: z.string().default('http://localhost:5173'),

  DATABASE_URL: z.string().optional(),

  JWT_ACCESS_SECRET: z.string().default('dev_jwt_access_secret_super_secure_boa_pms_2026'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),

  JWT_REFRESH_SECRET: z.string().default('dev_jwt_refresh_secret_super_secure_boa_pms_2026'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  BREVO_API_KEY: z.string().optional(),
  BREVO_SENDER_EMAIL: z.string().default('no-reply@abyssinia.et'),
  BREVO_SENDER_NAME: z.string().default('Bank of Abyssinia Performance Management'),

  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;
