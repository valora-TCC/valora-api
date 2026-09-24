import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  DATABASE_URL: z.string().min(1),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SUPABASE_JWKS_URL: z.string().url().optional(),
  SUPABASE_JWT_SECRET: z.string().optional(),
  BRAPI_TOKEN: z.string().optional(),

  BELVO_ENV: z.enum(['sandbox', 'production']).default('sandbox'),
  BELVO_BASE_URL: z.string().url().default('https://sandbox.belvo.com'),
  BELVO_SECRET_ID: z.string().optional(),
  BELVO_SECRET_PASSWORD: z.string().optional(),
  BELVO_WEBHOOK_SECRET: z.string().optional(),
  BELVO_WIDGET_CALLBACK_BASE_URL: z.string().url().optional(),
  BELVO_TERMS_URL: z.string().url().default('https://belvo.com/terms-service/'),
  BELVO_COMPANY_ICON_URL: z
    .string()
    .url()
    .default('https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f3e6.svg'),
  BELVO_COMPANY_LOGO_URL: z
    .string()
    .url()
    .default('https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f3e6.svg'),
  BELVO_COMPANY_NAME: z.string().default('Valora'),
  OPEN_FINANCE_DEMO_ENABLED: z.enum(['true', 'false']).optional(),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    const message = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Invalid environment variables: ${message}`);
  }
  return parsed.data;
}
