import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { getEnv } from "@/lib/env";

export interface OutgoingEmail {
  to: string;
  subject: string;
  text: string;
  html: string;
}

let transporter: Transporter | null = null;

function smtpTransport(): Transporter {
  if (transporter) return transporter;
  const env = getEnv();

  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    requireTLS: !env.SMTP_SECURE,
    auth:
      env.SMTP_USER && env.SMTP_PASS
        ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
        : undefined,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });

  return transporter;
}

function parseFrom(from: string): { name?: string; email: string } {
  const match = /^\s*(?:"?([^"<]*?)"?\s*)?<([^<>\s]+)>\s*$/.exec(from);
  if (match) return { name: match[1]?.trim() || undefined, email: match[2] };
  return { email: from.trim() };
}

async function sendViaApi(message: OutgoingEmail): Promise<void> {
  const env = getEnv();
  const from = parseFrom(env.EMAIL_FROM);
  const key = env.EMAIL_API_KEY ?? "";

  let url: string;
  let headers: Record<string, string>;
  let body: unknown;

  if (env.EMAIL_API_PROVIDER === "brevo") {
    url = "https://api.brevo.com/v3/smtp/email";
    headers = { "api-key": key, accept: "application/json" };
    body = {
      sender: { email: from.email, ...(from.name ? { name: from.name } : {}) },
      to: [{ email: message.to }],
      subject: message.subject,
      textContent: message.text,
      htmlContent: message.html,
    };
  } else {
    url = "https://api.resend.com/emails";
    headers = { authorization: `Bearer ${key}` };
    body = {
      from: env.EMAIL_FROM,
      to: [message.to],
      subject: message.subject,
      text: message.text,
      html: message.html,
    };
  }

  const response = await fetch(url, {
    method: "POST",
    headers: { ...headers, "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
    redirect: "error",
  });

  if (!response.ok) {
    throw new Error(`email provider ${env.EMAIL_API_PROVIDER} answered ${response.status}`);
  }
}

export async function sendEmail(message: OutgoingEmail): Promise<void> {
  const env = getEnv();

  if (env.EMAIL_TRANSPORT === "log") {
    process.stdout.write(
      [
        "",
        "──────────── DEV EMAIL (not sent) ────────────",
        `To:      ${message.to}`,
        `Subject: ${message.subject}`,
        "",
        message.text,
        "───────────────────────────────────────────────",
        "",
      ].join("\n"),
    );
    return;
  }

  if (env.EMAIL_TRANSPORT === "api") {
    await sendViaApi(message);
    return;
  }

  await smtpTransport().sendMail({
    from: env.EMAIL_FROM,
    to: message.to,
    subject: message.subject,
    text: message.text,
    html: message.html,
  });
}
