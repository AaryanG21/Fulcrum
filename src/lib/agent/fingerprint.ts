import "server-only";
import { parseProductVersion, sanitizeScannedText } from "@/lib/agent/sanitize";
import { finalizeFinding } from "@/lib/agent/scoring";
import type { Finding } from "@/lib/agent/types";
import type { HeaderProbe } from "@/lib/agent/headers";

export interface Fingerprint {
  product: string;
  version: string | null;
  sourceHeader: string;
  evidence: string;
  injectionAttempt: boolean;
}

const FINGERPRINT_HEADERS = [
  "server",
  "x-powered-by",
  "x-aspnet-version",
  "x-generator",
];

const KNOWN_PRODUCTS = new Set([
  "nginx",
  "apache",
  "openssl",
  "iis",
  "microsoft-iis",
  "lighttpd",
  "caddy",
  "tomcat",
  "jetty",
  "node",
  "express",
  "php",
  "wordpress",
  "drupal",
  "haproxy",
  "envoy",
  "traefik",
  "gunicorn",
  "uvicorn",
  "litespeed",
  "openresty",
]);

export function fingerprint(probe: HeaderProbe): Fingerprint[] {
  if (!probe.ok || !probe.headers) return [];

  const results: Fingerprint[] = [];

  for (const header of FINGERPRINT_HEADERS) {
    const raw = probe.headers.get(header);
    if (!raw) continue;

    const evidence = sanitizeScannedText(raw);
    const parsed = parseProductVersion(raw);
    if (!parsed) continue;

    const product =
      parsed.product === "microsoft-iis" ? "iis" : parsed.product;

    if (!KNOWN_PRODUCTS.has(product)) continue;

    results.push({
      product,
      version: parsed.version,
      sourceHeader: header,
      evidence: evidence.text,
      injectionAttempt: evidence.injectionAttempt,
    });
  }

  return dedupe(results);
}

function dedupe(items: Fingerprint[]): Fingerprint[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.product}@${item.version ?? "?"}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function fingerprintFindings(fingerprints: Fingerprint[]): Finding[] {
  return fingerprints.map((fp) =>
    finalizeFinding({
      checkId: `fingerprint:${fp.product}`,
      source: "fingerprint",
      title: fp.version
        ? `Identified ${fp.product} ${fp.version}`
        : `Identified ${fp.product} (no version disclosed)`,
      description:
        "Reported by the target in a response header. This is the target's own claim about itself, not a verified fact, and it is used only to select which CVEs to look up.",
      remediation:
        "No action required for the identification itself. See any associated CVE findings.",
      severity: "INFO",
      exploitability: 0,
      exposure: 0,
      effort: 0,
      evidence: `${fp.sourceHeader}: ${fp.evidence}`,
      ...(fp.injectionAttempt ? { injectionAttempt: true } : {}),
    }),
  );
}
