export type NormalizeResult =
  | { ok: true; hostname: string }
  | { ok: false; reason: string };

const LABEL = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;

const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/;

const BLOCKED_SUFFIXES = [
  "localhost",
  ".localhost",
  ".local",
  ".internal",
  ".localdomain",
];

export function normalizeHostname(input: string): NormalizeResult {
  let value = input.trim();

  if (value.length === 0) return { ok: false, reason: "Enter a hostname" };
  if (value.length > 253) return { ok: false, reason: "Hostname is too long" };

  if (/[\s\u0000-\u001f\u007f]/.test(value)) {
    return { ok: false, reason: "Hostname contains invalid characters" };
  }

  if (value.includes("://")) {
    try {
      const url = new URL(value);
      if (url.username || url.password) {
        return { ok: false, reason: "Credentials are not allowed in a hostname" };
      }
      if (url.port) {
        return { ok: false, reason: "Specify the hostname without a port" };
      }
      value = url.hostname;
    } catch {
      return { ok: false, reason: "Enter a valid hostname" };
    }
  }

  if (value.includes("@")) {
    return { ok: false, reason: "Credentials are not allowed in a hostname" };
  }
  if (value.includes("/") || value.includes("?") || value.includes("#")) {
    return { ok: false, reason: "Enter the hostname only, without a path" };
  }
  if (value.includes(":")) {
    return { ok: false, reason: "Specify the hostname without a port" };
  }

  value = value.replace(/\.$/, "").toLowerCase();

  let ascii: string;
  try {
    ascii = new URL(`https://${value}`).hostname;
  } catch {
    return { ok: false, reason: "Enter a valid hostname" };
  }

  if (ascii !== value && !/^[a-z0-9.-]+$/.test(value)) {
    value = ascii;
  } else {
    value = ascii;
  }

  if (IPV4.test(value) || value.includes("[") || value.includes("]")) {
    return {
      ok: false,
      reason: "Register a domain name, not an IP address — ownership of an IP cannot be verified here",
    };
  }

  const labels = value.split(".");
  if (labels.length < 2) {
    return { ok: false, reason: "Enter a fully-qualified domain, e.g. example.com" };
  }

  for (const label of labels) {
    if (!LABEL.test(label)) {
      return { ok: false, reason: "Hostname contains an invalid label" };
    }
  }

  const tld = labels.at(-1)!;
  if (!/^[a-z]{2,63}$/.test(tld)) {
    return { ok: false, reason: "Hostname has an invalid top-level domain" };
  }

  for (const suffix of BLOCKED_SUFFIXES) {
    if (value === suffix.replace(/^\./, "") || value.endsWith(suffix)) {
      return {
        ok: false,
        reason: "Internal and loopback hostnames cannot be scanned",
      };
    }
  }

  return { ok: true, hostname: value };
}

export function hostnameMatches(candidate: string, allowlisted: string): boolean {
  const a = normalizeHostname(candidate);
  const b = normalizeHostname(allowlisted);
  return a.ok && b.ok && a.hostname === b.hostname;
}
