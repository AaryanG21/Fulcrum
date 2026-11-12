import "server-only";
import { lookup as dnsLookup } from "node:dns/promises";
import { request as httpsRequest } from "node:https";
import { isPublicAddress } from "@/lib/net/ip-classification";
import type { LookupFunction } from "node:net";

export type AddressRefusal =
  | "unresolvable"
  | "private_address"
  | "no_public_address";

export type ResolveResult =
  | { ok: true; address: string; family: 4 | 6 }
  | { ok: false; refusal: AddressRefusal; reason: string };

export async function resolveToPublicAddress(hostname: string): Promise<ResolveResult> {
  let answers: Array<{ address: string; family: number }>;
  try {
    answers = await dnsLookup(hostname, { all: true, verbatim: true });
  } catch {
    return {
      ok: false,
      refusal: "unresolvable",
      reason: `${hostname} could not be resolved.`,
    };
  }

  if (answers.length === 0) {
    return {
      ok: false,
      refusal: "unresolvable",
      reason: `${hostname} resolved to no addresses.`,
    };
  }

  const offending = answers.find((answer) => !isPublicAddress(answer.address));
  if (offending) {
    return {
      ok: false,
      refusal: "private_address",
      reason: `${hostname} resolves to ${offending.address}, which is a private, loopback, link-local or otherwise non-public address. Refusing to connect.`,
    };
  }

  const chosen = answers[0];
  if (!chosen) {
    return {
      ok: false,
      refusal: "no_public_address",
      reason: `${hostname} resolved to no usable address.`,
    };
  }

  return {
    ok: true,
    address: chosen.address,
    family: chosen.family === 6 ? 6 : 4,
  };
}

export interface SafeGetOptions {
  hostname: string;
  path: string;
  headers?: Record<string, string>;
  timeoutMs: number;
  maxBytes?: number;
}

export type SafeGetResult =
  | {
      ok: true;
      status: number;
      headers: Headers;
      body?: string;
      bodyTooLarge?: boolean;
    }
  | {
      ok: false;
      kind: "refused" | "timeout" | "network";
      refusal?: AddressRefusal;
      reason: string;
    };

export async function safeHttpsGet(options: SafeGetOptions): Promise<SafeGetResult> {
  const resolved = await resolveToPublicAddress(options.hostname);
  if (!resolved.ok) {
    return {
      ok: false,
      kind: "refused",
      refusal: resolved.refusal,
      reason: resolved.reason,
    };
  }

  const pinned: LookupFunction = (_hostname, _opts, callback) => {
    const asAll = (_opts as { all?: boolean } | undefined)?.all === true;
    const entry = { address: resolved.address, family: resolved.family };
    if (asAll) {
      (callback as unknown as (
        err: NodeJS.ErrnoException | null,
        addresses: Array<{ address: string; family: number }>,
      ) => void)(null, [entry]);
    } else {
      callback(null, resolved.address, resolved.family);
    }
  };

  return new Promise<SafeGetResult>((resolve) => {
    let settled = false;
    const finish = (result: SafeGetResult) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    const req = httpsRequest(
      {
        host: options.hostname,
        servername: options.hostname,
        path: options.path,
        method: "GET",
        headers: options.headers ?? {},
        lookup: pinned,
        timeout: options.timeoutMs,
      },
      (res) => {
        const headers = new Headers();
        for (const [key, value] of Object.entries(res.headers)) {
          if (Array.isArray(value)) for (const v of value) headers.append(key, v);
          else if (typeof value === "string") headers.set(key, value);
        }

        const status = res.statusCode ?? 0;

        if (options.maxBytes === undefined) {
          res.destroy();
          finish({ ok: true, status, headers });
          return;
        }

        const chunks: Buffer[] = [];
        let total = 0;
        let tooLarge = false;

        res.on("data", (chunk: Buffer) => {
          total += chunk.byteLength;
          if (total > (options.maxBytes as number)) {
            tooLarge = true;
            res.destroy();
            return;
          }
          chunks.push(chunk);
        });
        res.on("close", () => {
          if (tooLarge) {
            finish({ ok: true, status, headers, bodyTooLarge: true });
            return;
          }
          finish({
            ok: true,
            status,
            headers,
            body: Buffer.concat(chunks).toString("utf8"),
          });
        });
        res.on("error", () =>
          finish({
            ok: false,
            kind: "network",
            reason: "The connection failed while reading the response.",
          }),
        );
      },
    );

    req.on("timeout", () => {
      req.destroy();
      finish({ ok: false, kind: "timeout", reason: "The request timed out." });
    });

    req.on("error", () =>
      finish({
        ok: false,
        kind: "network",
        reason: "Could not establish an HTTPS connection.",
      }),
    );

    req.end();
  });
}
