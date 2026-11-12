import "server-only";
import { randomBytes } from "node:crypto";
import { hash, verify } from "@node-rs/argon2";
import type { Algorithm } from "@node-rs/argon2";

const ARGON2ID = 2 as Algorithm;

const PARAMS = {
  algorithm: ARGON2ID,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

export const MIN_PASSWORD_LENGTH = 12;
export const MAX_PASSWORD_LENGTH = 128;

export async function hashPassword(plaintext: string): Promise<string> {
  return hash(plaintext, PARAMS);
}

export async function verifyPassword(
  storedHash: string,
  plaintext: string,
): Promise<boolean> {
  try {
    return await verify(storedHash, plaintext, PARAMS);
  } catch {
    return false;
  }
}

export function needsRehash(storedHash: string): boolean {
  const m = /\$argon2id\$v=19\$m=(\d+),t=(\d+),p=(\d+)\$/.exec(storedHash);
  if (!m) return true;

  const [, memory, time, parallelism] = m;
  return (
    Number(memory) < PARAMS.memoryCost ||
    Number(time) < PARAMS.timeCost ||
    Number(parallelism) < PARAMS.parallelism
  );
}

let decoyHash: Promise<string> | null = null;

export async function fakeVerifyForTiming(plaintext: string): Promise<void> {
  decoyHash ??= hash(randomBytes(32).toString("hex"), PARAMS);
  await verifyPassword(await decoyHash, plaintext);
}
