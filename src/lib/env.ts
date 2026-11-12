import "server-only";
import { z } from "zod";

const base64Key = (bytes: number, label: string) =>
  z
    .string()
    .min(1, `${label} is required`)
    .refine(
      (v) => {
        try {
          return Buffer.from(v, "base64").length === bytes;
        } catch {
          return false;
        }
      },
      `${label} must be ${bytes} raw bytes, base64-encoded (generate with: openssl rand -base64 ${bytes})`,
    );

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  DATABASE_URL: z.string().min(1).startsWith("postgresql://"),

  JWT_SIGNING_KEY: base64Key(32, "JWT_SIGNING_KEY"),

  TOTP_ENCRYPTION_KEY: base64Key(32, "TOTP_ENCRYPTION_KEY"),

  APP_ORIGIN: z.string().url(),

  APP_NAME: z.string().default("Fulcrum"),

  ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().min(60).max(3600).default(600),
  REFRESH_TOKEN_TTL_SECONDS: z.coerce
    .number()
    .int()
    .min(3600)
    .max(60 * 60 * 24 * 30)
    .default(60 * 60 * 24 * 7),
  MFA_PENDING_TTL_SECONDS: z.coerce.number().int().min(60).max(900).default(300),
  REAUTH_TTL_SECONDS: z.coerce.number().int().min(60).max(900).default(300),

  MAX_FAILED_LOGINS: z.coerce.number().int().min(3).max(20).default(5),
  LOCKOUT_BASE_SECONDS: z.coerce.number().int().min(30).default(900),

  DOMAIN_VERIFICATION_TTL_DAYS: z.coerce
    .number()
    .int()
    .min(1)
    .max(36_500)
    .default(90),

  SCAN_CONCURRENCY: z.coerce.number().int().min(1).max(8).default(2),

  SCAN_QUEUE_MAX_DEPTH: z.coerce.number().int().min(1).max(10_000).default(50),

  TESTSSL_PATH: z.string().default("./vendor/testssl.sh/testssl.sh"),
  TESTSSL_TIMEOUT_MS: z.coerce.number().int().min(10_000).max(1_800_000).default(300_000),

  EMAIL_TRANSPORT: z.enum(["smtp", "api", "log"]).default("log"),
  EMAIL_API_PROVIDER: z.enum(["brevo", "resend"]).optional(),
  EMAIL_API_KEY: z.string().min(8).optional(),
  EMAIL_FROM: z.string().min(3).default("Fulcrum <no-reply@localhost>"),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
  SMTP_SECURE: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),

  EMAIL_VERIFICATION_TTL_HOURS: z.coerce.number().int().min(1).max(168).default(24),
  PASSWORD_RESET_TTL_MINUTES: z.coerce.number().int().min(10).max(1440).default(60),

  TRUST_PROXY_HEADERS: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),

  TRUSTED_PROXY_HOPS: z.coerce.number().int().min(0).max(10).default(0),
})
  .superRefine((env, ctx) => {
    if (
      env.NODE_ENV === "production" &&
      env.EMAIL_TRANSPORT === "log" &&
      process.env.NEXT_PHASE !== "phase-production-build"
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["EMAIL_TRANSPORT"],
        message:
          'must be "smtp" or "api" in production — the "log" transport prints password-reset links to stdout',
      });
    }

    if (env.EMAIL_TRANSPORT === "api") {
      if (!env.EMAIL_API_PROVIDER) {
        ctx.addIssue({
          code: "custom",
          path: ["EMAIL_API_PROVIDER"],
          message: 'is required when EMAIL_TRANSPORT is "api"',
        });
      }
      if (!env.EMAIL_API_KEY) {
        ctx.addIssue({
          code: "custom",
          path: ["EMAIL_API_KEY"],
          message: 'is required when EMAIL_TRANSPORT is "api"',
        });
      }
    }

    if (env.EMAIL_TRANSPORT === "smtp" && !env.SMTP_HOST) {
      ctx.addIssue({
        code: "custom",
        path: ["SMTP_HOST"],
        message: 'is required when EMAIL_TRANSPORT is "smtp"',
      });
    }

    if (env.TRUST_PROXY_HEADERS && env.TRUSTED_PROXY_HOPS === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["TRUSTED_PROXY_HOPS"],
        message:
          "must be at least 1 when TRUST_PROXY_HEADERS is true — set it to the number of reverse proxies in front of this app",
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

export function getEnv(): Env {
  if (cached) return cached;

  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid server environment:\n${issues}`);
  }

  cached = parsed.data;
  return cached;
}

export function resetEnvCache(): void {
  cached = null;
}
