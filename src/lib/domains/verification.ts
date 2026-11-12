import "server-only";
import { resolveTxt } from "node:dns/promises";
import { randomToken } from "@/lib/crypto";
import { normalizeHostname } from "@/lib/validation/hostname";
import { safeHttpsGet } from "@/lib/net/safe-request";

export const DNS_CHALLENGE_PREFIX = "_fulcrum-challenge";
export const HTTP_CHALLENGE_PATH = "/.well-known/fulcrum-challenge.txt";

const HTTP_TIMEOUT_MS = 10_000;
const MAX_RESPONSE_BYTES = 4096;

export function generateVerificationToken(): string {
  return `fulcrum-verify=${randomToken(24)}`;
}

export type VerificationOutcome =
  | { verified: true; method: "DNS_TXT" | "HTTP_WELL_KNOWN"; evidence: string }
  | { verified: false; reason: string };

export async function verifyDnsTxt(
  hostname: string,
  expectedToken: string,
): Promise<VerificationOutcome> {
  const normalized = normalizeHostname(hostname);
  if (!normalized.ok) return { verified: false, reason: normalized.reason };

  const name = `${DNS_CHALLENGE_PREFIX}.${normalized.hostname}`;

  let records: string[][];
  try {
    records = await resolveTxt(name);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code ?? "UNKNOWN";
    return {
      verified: false,
      reason:
        code === "ENOTFOUND" || code === "ENODATA"
          ? `No TXT record found at ${name}. DNS changes can take a few minutes to propagate.`
          : `DNS lookup failed (${code}).`,
    };
  }

  const values = records.map((chunks) => chunks.join(""));

  if (!values.some((v) => v.trim() === expectedToken)) {
    return {
      verified: false,
      reason: `Found ${values.length} TXT record(s) at ${name}, none matching the expected token.`,
    };
  }

  return { verified: true, method: "DNS_TXT", evidence: name };
}

export async function verifyHttpWellKnown(
  hostname: string,
  expectedToken: string,
): Promise<VerificationOutcome> {
  const normalized = normalizeHostname(hostname);
  if (!normalized.ok) return { verified: false, reason: normalized.reason };

  const url = `https://${normalized.hostname}${HTTP_CHALLENGE_PATH}`;

  const result = await safeHttpsGet({
    hostname: normalized.hostname,
    path: HTTP_CHALLENGE_PATH,
    timeoutMs: HTTP_TIMEOUT_MS,
    maxBytes: MAX_RESPONSE_BYTES,
    headers: { "User-Agent": "Fulcrum-DomainVerification/1.0" },
  });

  if (!result.ok) {
    if (result.kind === "refused") {
      return { verified: false, reason: result.reason };
    }
    return {
      verified: false,
      reason:
        result.kind === "timeout"
          ? "Challenge URL timed out."
          : "Could not reach the challenge URL over HTTPS.",
    };
  }

  if (result.status >= 300 && result.status < 400) {
    return {
      verified: false,
      reason:
        "The challenge URL redirected. Serve the file directly at that path — redirects are not followed.",
    };
  }

  if (result.status < 200 || result.status >= 300) {
    return { verified: false, reason: `Challenge URL returned HTTP ${result.status}.` };
  }

  if (result.bodyTooLarge || result.body === undefined) {
    return { verified: false, reason: "Challenge file is too large." };
  }

  if (result.body.trim() !== expectedToken) {
    return {
      verified: false,
      reason: "Challenge file did not contain the expected token.",
    };
  }

  return { verified: true, method: "HTTP_WELL_KNOWN", evidence: url };
}

export async function runVerification(
  method: "DNS_TXT" | "HTTP_WELL_KNOWN",
  hostname: string,
  expectedToken: string,
): Promise<VerificationOutcome> {
  return method === "DNS_TXT"
    ? verifyDnsTxt(hostname, expectedToken)
    : verifyHttpWellKnown(hostname, expectedToken);
}
