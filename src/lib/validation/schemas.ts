import { z } from "zod";
import { MIN_PASSWORD_LENGTH, MAX_PASSWORD_LENGTH } from "@/lib/auth/password";
import { normalizeHostname } from "@/lib/validation/hostname";

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(254)
  .email("Enter a valid email address");

export const passwordSchema = z
  .string()
  .min(MIN_PASSWORD_LENGTH, `Use at least ${MIN_PASSWORD_LENGTH} characters`)
  .max(MAX_PASSWORD_LENGTH, "Password is too long");

export const totpCodeSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, "Enter the 6-digit code from your authenticator app");

export const backupCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/, "Enter a backup code in the form XXXX-XXXX");

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  acceptedTerms: z.literal(true, {
    message:
      "You must confirm you are 18 or older and accept the Terms and Privacy Policy.",
  }),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(MAX_PASSWORD_LENGTH),
});

export const twoFactorVerifySchema = z
  .object({
    code: totpCodeSchema.optional(),
    backupCode: backupCodeSchema.optional(),
  })
  .refine((v) => Boolean(v.code) !== Boolean(v.backupCode), {
    message: "Provide either a 6-digit code or a backup code, not both",
  });

export const emailedTokenSchema = z.string().trim().min(20).max(200);

export const emailOnlySchema = z.object({ email: emailSchema });

export const verifyEmailSchema = z.object({ token: emailedTokenSchema });

export const resetPasswordSchema = z
  .object({
    token: emailedTokenSchema,
    password: passwordSchema,
    code: totpCodeSchema.optional(),
    backupCode: backupCodeSchema.optional(),
  })
  .refine((v) => !(v.code && v.backupCode), {
    message: "Provide either a 6-digit code or a backup code, not both",
  });

export const tryItSchema = z.object({ hostname: z.string().trim().min(1).max(253) });

export const scanScheduleSchema = z.object({
  intervalDays: z.union([z.literal(7), z.literal(30)]),
  budget: z.number().int().min(1).max(1000).default(15),
  notifyOnRegression: z.boolean().default(true),
});

export const reauthSchema = z.object({
  password: z.string().min(1).max(MAX_PASSWORD_LENGTH),
  code: totpCodeSchema,
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1).max(MAX_PASSWORD_LENGTH),
    newPassword: passwordSchema,
  })
  .refine((v) => v.currentPassword !== v.newPassword, {
    message: "Choose a password you have not used here before",
    path: ["newPassword"],
  });

export const hostnameSchema = z
  .string()
  .trim()
  .min(1, "Enter a hostname")
  .max(253, "Hostname is too long")
  .transform((value, ctx) => {
    const result = normalizeHostname(value);
    if (!result.ok) {
      ctx.addIssue({ code: "custom", message: result.reason });
      return z.NEVER;
    }
    return result.hostname;
  });

export const addDomainSchema = z.object({
  hostname: hostnameSchema,
  method: z.enum(["DNS_TXT", "HTTP_WELL_KNOWN"]).default("DNS_TXT"),
});

export const publicScanRequestSchema = z.object({
  hostname: hostnameSchema,
  budget: z.coerce.number().int().min(1).max(1000),
});

export const scanRequestSchema = z.object({
  domainId: z.string().min(1).max(64),
  budget: z.coerce.number().int().min(1).max(1000),
});

export const adminUserActionSchema = z.object({
  userId: z.string().min(1).max(64),
  reason: z.string().trim().min(3).max(500),
});

export const adminRevokeDomainSchema = z.object({
  domainId: z.string().min(1).max(64),
  reason: z.string().trim().min(3).max(500),
});

export const paginationSchema = z.object({
  cursor: z.string().max(64).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export async function parseJsonBody<S extends z.ZodType>(
  request: Request,
  schema: S,
): Promise<
  | { ok: true; data: z.infer<S> }
  | { ok: false; fieldErrors: Record<string, string[]> }
> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return { ok: false, fieldErrors: { _: ["Request body must be valid JSON"] } };
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".") || "_";
      (fieldErrors[key] ??= []).push(issue.message);
    }
    return { ok: false, fieldErrors };
  }

  return { ok: true, data: parsed.data };
}
