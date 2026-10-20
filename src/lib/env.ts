import { z } from "zod";

const serverEnvSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    NEXT_PUBLIC_SITE_URL: z.url(),
    APP_TIMEZONE: z.string().min(1).default("Asia/Karachi"),

    // A value with quotes or a leading space around it is not a URL, and the driver then falls back to a dummy host
    // named "base". Rejecting it here turns that into a clear message at startup instead of a failed connection.
    DATABASE_URL: z
      .string()
      .regex(/^postgres(?:ql)?:\/\/\S+$/, "DATABASE_URL must start with postgresql:// and have no quotes or spaces around it."),

    BETTER_AUTH_URL: z.url(),
    BETTER_AUTH_SECRET: z.string().min(32, "BETTER_AUTH_SECRET must be at least 32 characters."),

    EMAIL_DRIVER: z.enum(["dev-sink", "resend"]).default("dev-sink"),
    /** Must be an address on a domain verified in Resend, for example "UPS Alumni Network <no-reply@yourdomain>". */
    EMAIL_FROM: z.string().min(3),
    /** Server-only. Create it in the Resend dashboard with sending access. */
    RESEND_API_KEY: z.string().min(10, "RESEND_API_KEY looks too short.").optional(),

    STORAGE_DRIVER: z.enum(["local", "supabase"]).default("local"),
    STORAGE_LOCAL_DIR: z.string().min(1).default(".local-storage"),
    SUPABASE_URL: z.url().optional(),
    /** Server-only. Bypasses row-level security, so it must never be exposed to the browser. */
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(20, "SUPABASE_SERVICE_ROLE_KEY looks too short.").optional(),
    SUPABASE_STORAGE_BUCKET: z.string().min(1).default("ups-alumni-private"),
  })
  .superRefine((env, ctx) => {
    const isProduction = env.NODE_ENV === "production";

    if (isProduction && env.EMAIL_DRIVER !== "resend") {
      ctx.addIssue({ code: "custom", path: ["EMAIL_DRIVER"], message: "Production requires EMAIL_DRIVER=resend." });
    }
    if (isProduction && env.STORAGE_DRIVER !== "supabase") {
      ctx.addIssue({ code: "custom", path: ["STORAGE_DRIVER"], message: "Production requires STORAGE_DRIVER=supabase." });
    }
    if (env.EMAIL_DRIVER === "resend" && !env.RESEND_API_KEY) {
      ctx.addIssue({ code: "custom", path: ["RESEND_API_KEY"], message: "RESEND_API_KEY is required when EMAIL_DRIVER=resend." });
    }
    if (env.STORAGE_DRIVER === "supabase") {
      const missing = (["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"] as const).filter((key) => !env[key]);
      for (const key of missing) {
        ctx.addIssue({ code: "custom", path: [key], message: `${key} is required when STORAGE_DRIVER=supabase.` });
      }
    }
  });

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cachedEnv: ServerEnv | undefined;

/**
 * Returns validated server configuration. Error messages name the variables that failed
 * but never echo their values, so secrets cannot leak through logs.
 */
export function getEnv(): ServerEnv {
  if (cachedEnv) {
    return cachedEnv;
  }

  const parsed = serverEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${details}`);
  }

  cachedEnv = parsed.data;
  return cachedEnv;
}
