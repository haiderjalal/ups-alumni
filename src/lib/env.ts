import { z } from "zod";

/**
 * Parses a `"true" | "false"` environment string. Anything else fails validation
 * rather than silently becoming `false`.
 */
const booleanFlag = (defaultValue: boolean) =>
  z
    .enum(["true", "false"])
    .default(defaultValue ? "true" : "false")
    .transform((value) => value === "true");

const serverEnvSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    NEXT_PUBLIC_SITE_URL: z.url(),
    APP_TIMEZONE: z.string().min(1).default("Asia/Karachi"),

    DATABASE_URL: z.string().min(1),

    BETTER_AUTH_URL: z.url(),
    BETTER_AUTH_SECRET: z.string().min(32, "BETTER_AUTH_SECRET must be at least 32 characters."),

    EMAIL_DRIVER: z.enum(["dev-sink", "smtp"]).default("dev-sink"),
    EMAIL_FROM: z.string().min(3),
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().int().positive().default(587),
    SMTP_SECURE: booleanFlag(false),
    SMTP_USER: z.string().optional(),
    SMTP_PASSWORD: z.string().optional(),

    STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
    STORAGE_LOCAL_DIR: z.string().min(1).default(".local-storage"),
    S3_ENDPOINT: z.url().optional(),
    S3_REGION: z.string().min(1).default("us-east-1"),
    S3_BUCKET: z.string().optional(),
    S3_ACCESS_KEY_ID: z.string().optional(),
    S3_SECRET_ACCESS_KEY: z.string().optional(),
    S3_FORCE_PATH_STYLE: booleanFlag(true),
  })
  .superRefine((env, ctx) => {
    const isProduction = env.NODE_ENV === "production";

    if (isProduction && env.EMAIL_DRIVER !== "smtp") {
      ctx.addIssue({ code: "custom", path: ["EMAIL_DRIVER"], message: "Production requires EMAIL_DRIVER=smtp." });
    }
    if (isProduction && env.STORAGE_DRIVER !== "s3") {
      ctx.addIssue({ code: "custom", path: ["STORAGE_DRIVER"], message: "Production requires STORAGE_DRIVER=s3." });
    }
    if (env.EMAIL_DRIVER === "smtp" && !env.SMTP_HOST) {
      ctx.addIssue({ code: "custom", path: ["SMTP_HOST"], message: "SMTP_HOST is required when EMAIL_DRIVER=smtp." });
    }
    if (env.STORAGE_DRIVER === "s3") {
      const missing = (["S3_BUCKET", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"] as const).filter((key) => !env[key]);
      for (const key of missing) {
        ctx.addIssue({ code: "custom", path: [key], message: `${key} is required when STORAGE_DRIVER=s3.` });
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
