export const MAX_EVIDENCE_LENGTH = 512;

export const MAX_TOTAL_EVIDENCE_LENGTH = 64 * 1024;

const INSTRUCTION_PATTERNS: RegExp[] = [
  /\bignore\s+(all\s+)?(previous|prior|above|preceding)\b/i,
  /\bdisregard\s+(all\s+)?(previous|prior|above|instructions)\b/i,
  /\b(system|assistant|user)\s*[:>]\s*/i,
  /\bnew\s+instructions?\b/i,
  /\byou\s+(are|must|should)\s+(now\s+)?(a|an|to)\b/i,
  /\bmark\s+(this|the)\s+(site|host|domain)\s+as\s+secure\b/i,
  /\b(set|assign|override)\s+(the\s+)?(risk[_\s-]?score|score|grade|severity)\b/i,
  /\bfalse\s+positive\b/i,
  /\bthis\s+(finding|result)\s+has\s+been\s+retracted\b/i,
  /\bprompt\s*injection\b/i,
  /\$\{[^}]*\}/,
  /\{\{[^}]*\}\}/,
  /\bjndi:/i,
];

export interface SanitizedText {
  text: string;
  injectionAttempt: boolean;
  truncated: boolean;
}

export function sanitizeScannedText(input: unknown): SanitizedText {
  if (typeof input !== "string") {
    return { text: "", injectionAttempt: false, truncated: false };
  }

  const stripped = input.replace(/[\u0000-\u001f\u007f-\u009f]/g, " ");

  const collapsed = stripped.replace(/\s+/g, " ").trim();

  const injectionAttempt = INSTRUCTION_PATTERNS.some((p) => p.test(collapsed));

  const truncated = collapsed.length > MAX_EVIDENCE_LENGTH;
  const text = truncated
    ? `${collapsed.slice(0, MAX_EVIDENCE_LENGTH)}…[truncated]`
    : collapsed;

  return { text, injectionAttempt, truncated };
}

export function parseProductVersion(
  banner: string,
): { product: string; version: string | null } | null {
  const clean = sanitizeScannedText(banner).text;

  const match = /^([A-Za-z][A-Za-z0-9_.+-]{0,39})(?:\/([0-9]+(?:\.[0-9]+){0,3}[a-z]?))?/.exec(
    clean,
  );
  if (!match) return null;

  const [, product, version] = match;
  if (!product) return null;

  return { product: product.toLowerCase(), version: version ?? null };
}

export function parseJsonBounded(
  raw: string,
  opts: { maxBytes?: number; maxDepth?: number } = {},
): { ok: true; value: unknown } | { ok: false; reason: string } {
  const maxBytes = opts.maxBytes ?? 16 * 1024 * 1024;
  const maxDepth = opts.maxDepth ?? 64;

  if (Buffer.byteLength(raw, "utf8") > maxBytes) {
    return { ok: false, reason: `Output exceeds ${maxBytes} bytes` };
  }

  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : "Invalid JSON",
    };
  }

  if (exceedsDepth(value, maxDepth)) {
    return { ok: false, reason: `Structure nested deeper than ${maxDepth}` };
  }

  return { ok: true, value };
}

function exceedsDepth(root: unknown, maxDepth: number): boolean {
  const stack: Array<{ node: unknown; depth: number }> = [{ node: root, depth: 0 }];

  while (stack.length > 0) {
    const { node, depth } = stack.pop()!;
    if (depth > maxDepth) return true;
    if (node === null || typeof node !== "object") continue;

    for (const child of Object.values(node as Record<string, unknown>)) {
      stack.push({ node: child, depth: depth + 1 });
    }
  }

  return false;
}
