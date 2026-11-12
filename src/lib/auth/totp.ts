import "server-only";
import { randomInt } from "node:crypto";
import {
  NobleCryptoPlugin,
  ScureBase32Plugin,
  TOTP,
  generateSecret,
  generateURI,
} from "otplib";
import { hash as argonHash, verify as argonVerify } from "@node-rs/argon2";
import type { Algorithm } from "@node-rs/argon2";
import { prisma } from "@/lib/db";
import { encryptSecret, decryptSecret } from "@/lib/crypto";
import { getEnv } from "@/lib/env";

const PERIOD_SECONDS = 30;

const CRYPTO_PLUGIN = new NobleCryptoPlugin();
const BASE32_PLUGIN = new ScureBase32Plugin();

const EPOCH_TOLERANCE = PERIOD_SECONDS;

export const BACKUP_CODE_COUNT = 10;

export function generateTotpSecret(): string {
  return generateSecret({ length: 20, crypto: CRYPTO_PLUGIN, base32: BASE32_PLUGIN });
}

export function buildOtpAuthUri(email: string, secret: string): string {
  return generateURI({
    strategy: "totp",
    issuer: getEnv().APP_NAME,
    label: email,
    secret,
    digits: 6,
    period: PERIOD_SECONDS,
  });
}

export function encryptTotpSecret(secret: string): string {
  return encryptSecret(secret);
}

export interface TotpCheck {
  valid: boolean;
  timeStep?: number;
}

export async function verifyTotpCode(
  encryptedSecret: string,
  code: string,
  lastTimeStep: number | null,
): Promise<TotpCheck> {
  const normalized = code.replace(/\s+/g, "");
  if (!/^\d{6}$/.test(normalized)) return { valid: false };

  let secret: string;
  try {
    secret = decryptSecret(encryptedSecret);
  } catch {
    return { valid: false };
  }

  try {
    const totp = new TOTP({
      secret,
      digits: 6,
      period: PERIOD_SECONDS,
      crypto: CRYPTO_PLUGIN,
      base32: BASE32_PLUGIN,
    });

    const result = await totp.verify(normalized, {
      epochTolerance: EPOCH_TOLERANCE,
      ...(lastTimeStep !== null ? { afterTimeStep: lastTimeStep } : {}),
    });

    return result.valid
      ? { valid: true, timeStep: result.timeStep }
      : { valid: false };
  } catch {
    return { valid: false };
  }
}

export async function commitTotpTimeStep(
  userId: string,
  timeStep: number,
): Promise<void> {
  await prisma.user.updateMany({
    where: {
      id: userId,
      OR: [
        { twoFactorLastTimeStep: null },
        { twoFactorLastTimeStep: { lt: timeStep } },
      ],
    },
    data: { twoFactorLastTimeStep: timeStep },
  });
}

const ARGON2ID = 2 as Algorithm;

const BACKUP_PARAMS = {
  algorithm: ARGON2ID,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

function formatBackupCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const pick = () =>
    Array.from({ length: 4 }, () => alphabet[randomInt(alphabet.length)]).join("");
  return `${pick()}-${pick()}`;
}

export async function issueBackupCodes(userId: string): Promise<string[]> {
  const codes = Array.from({ length: BACKUP_CODE_COUNT }, formatBackupCode);
  const hashes = await Promise.all(codes.map((c) => argonHash(c, BACKUP_PARAMS)));

  await prisma.$transaction([
    prisma.backupCode.deleteMany({ where: { userId } }),
    prisma.backupCode.createMany({
      data: hashes.map((codeHash) => ({ userId, codeHash })),
    }),
  ]);

  return codes;
}

export async function redeemBackupCode(
  userId: string,
  submitted: string,
): Promise<boolean> {
  const normalized = submitted.trim().toUpperCase();
  if (!/^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(normalized)) return false;

  const candidates = await prisma.backupCode.findMany({
    where: { userId, usedAt: null },
  });

  for (const candidate of candidates) {
    let matches = false;
    try {
      matches = await argonVerify(candidate.codeHash, normalized, BACKUP_PARAMS);
    } catch {
      matches = false;
    }
    if (!matches) continue;

    const spent = await prisma.backupCode.updateMany({
      where: { id: candidate.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    return spent.count === 1;
  }

  return false;
}

export async function countUnusedBackupCodes(userId: string): Promise<number> {
  return prisma.backupCode.count({ where: { userId, usedAt: null } });
}
