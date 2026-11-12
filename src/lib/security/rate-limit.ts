import "server-only";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
  strikes: number;
}

export interface RateLimitRule {
  limit: number;
  windowSeconds: number;
  exponentialBackoff?: boolean;
  maxBackoffSeconds?: number;
}

interface Bucket {
  hits: number[];
  strikes: number;
  blockedUntil: number;
}

export interface RateLimitStore {
  get(key: string): Bucket | undefined;
  set(key: string, bucket: Bucket): void;
  delete(key: string): void;
  entries(): IterableIterator<[string, Bucket]>;
}

class MemoryStore implements RateLimitStore {
  private readonly map = new Map<string, Bucket>();

  get(key: string) {
    return this.map.get(key);
  }
  set(key: string, bucket: Bucket) {
    this.map.set(key, bucket);
  }
  delete(key: string) {
    this.map.delete(key);
  }
  entries() {
    return this.map.entries();
  }
}

const store: RateLimitStore = new MemoryStore();

export const RATE_LIMITS = {
  login: {
    limit: 5,
    windowSeconds: 900,
    exponentialBackoff: true,
    maxBackoffSeconds: 3600,
  },
  twoFactor: {
    limit: 5,
    windowSeconds: 900,
    exponentialBackoff: true,
    maxBackoffSeconds: 3600,
  },
  passwordReset: {
    limit: 5,
    windowSeconds: 900,
    exponentialBackoff: true,
    maxBackoffSeconds: 3600,
  },
  reauth: {
    limit: 5,
    windowSeconds: 900,
    exponentialBackoff: true,
    maxBackoffSeconds: 3600,
  },
  register: { limit: 3, windowSeconds: 3600, exponentialBackoff: true },
  passwordForgot: { limit: 5, windowSeconds: 3600, exponentialBackoff: true },
  emailResend: { limit: 5, windowSeconds: 3600, exponentialBackoff: true },
  resetSpend: { limit: 8, windowSeconds: 900, exponentialBackoff: true },
  emailVerify: { limit: 20, windowSeconds: 3600 },
  tryIt: { limit: 6, windowSeconds: 3600 },
  tryItTarget: { limit: 6, windowSeconds: 3600 },
  tryItGlobal: { limit: 150, windowSeconds: 3600 },
  refresh: { limit: 60, windowSeconds: 3600 },
  scan: { limit: 10, windowSeconds: 3600 },
  domainVerify: { limit: 10, windowSeconds: 900 },
  publicScan: { limit: 30, windowSeconds: 3600 },
  api: { limit: 120, windowSeconds: 60 },
} as const satisfies Record<string, RateLimitRule>;

export type RateLimitName = keyof typeof RATE_LIMITS;

export function checkRateLimit(
  name: RateLimitName,
  key: string,
  now = Date.now(),
): RateLimitResult {
  maybeSweep(now);

  const rule: RateLimitRule = RATE_LIMITS[name];
  const compositeKey = `${name}:${key}`;
  const windowMs = rule.windowSeconds * 1000;

  const bucket = store.get(compositeKey) ?? {
    hits: [],
    strikes: 0,
    blockedUntil: 0,
  };

  if (bucket.blockedUntil > now) {
    store.set(compositeKey, bucket);
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: (bucket.blockedUntil - now) / 1000,
      strikes: bucket.strikes,
    };
  }

  bucket.hits = bucket.hits.filter((t) => t > now - windowMs);

  if (bucket.hits.length >= rule.limit) {
    bucket.strikes += 1;

    const backoffSeconds = rule.exponentialBackoff
      ? Math.min(
          rule.windowSeconds * 2 ** (bucket.strikes - 1),
          rule.maxBackoffSeconds ?? 3600,
        )
      : rule.windowSeconds;

    bucket.blockedUntil = now + backoffSeconds * 1000;
    store.set(compositeKey, bucket);

    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: backoffSeconds,
      strikes: bucket.strikes,
    };
  }

  bucket.hits.push(now);
  store.set(compositeKey, bucket);

  return {
    allowed: true,
    remaining: rule.limit - bucket.hits.length,
    retryAfterSeconds: 0,
    strikes: bucket.strikes,
  };
}

export function resetRateLimit(name: RateLimitName, key: string): void {
  store.delete(`${name}:${key}`);
}

let lastSweptAt = 0;
const SWEEP_INTERVAL_MS = 600_000;

function maybeSweep(now: number): void {
  if (now - lastSweptAt < SWEEP_INTERVAL_MS) return;
  lastSweptAt = now;
  sweepRateLimits(now);
}

export function sweepRateLimits(now = Date.now()): number {
  let removed = 0;
  for (const [key, bucket] of store.entries()) {
    const newest = bucket.hits.at(-1) ?? 0;
    const idleFor = now - Math.max(newest, bucket.blockedUntil);
    if (idleFor > 3600_000) {
      store.delete(key);
      removed += 1;
    }
  }
  return removed;
}

export function ipAccountKey(ip: string | null, account: string): string {
  return `${ip ?? "unknown-ip"}|${account.toLowerCase()}`;
}
