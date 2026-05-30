import { z } from "zod";

const serverEnvSchema = z.object({
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid Supabase PostgreSQL URL."),
  DIRECT_URL: z.string().url("DIRECT_URL must be a valid direct Supabase PostgreSQL URL."),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL."),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20, "NEXT_PUBLIC_SUPABASE_ANON_KEY is required."),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20).optional(),
  NEXT_PUBLIC_SITE_URL: z.string().url().optional(),
});

const publicEnvSchema = serverEnvSchema.pick({
  NEXT_PUBLIC_SUPABASE_URL: true,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: true,
  NEXT_PUBLIC_SITE_URL: true,
});

function formatEnvError(error: z.ZodError) {
  return error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("\n");
}

export function validateServerEnv() {
  const result = serverEnvSchema.safeParse(process.env);

  if (!result.success) {
    throw new Error(`Invalid environment configuration:\n${formatEnvError(result.error)}`);
  }

  return result.data;
}

export function validatePublicEnv() {
  const result = publicEnvSchema.safeParse(process.env);

  if (!result.success) {
    throw new Error(`Invalid public environment configuration:\n${formatEnvError(result.error)}`);
  }

  return result.data;
}

export const env = validateServerEnv();
