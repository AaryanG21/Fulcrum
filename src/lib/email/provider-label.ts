import "server-only";
import { getEnv } from "@/lib/env";
import { OPERATOR } from "@/lib/legal/operator";

export function emailProviderLabel(): string {
  const env = getEnv();
  if (env.EMAIL_TRANSPORT === "api") {
    return env.EMAIL_API_PROVIDER === "brevo"
      ? "Brevo, a transactional email service that sends our messages on our behalf"
      : "Resend, a transactional email service that sends our messages on our behalf";
  }
  return OPERATOR.emailProvider;
}
