import { isIP } from "node:net";

function ipv4Private(address: string): boolean {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
    return true;
  }
  const [a, b] = parts as [number, number, number, number];

  if (a === 0) return true;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 198 && (b === 18 || b === 19)) return true;
  if (a >= 224) return true;
  return false;
}

function ipv6Bytes(address: string): number[] | null {
  let text = address;

  const tail = /:(\d+\.\d+\.\d+\.\d+)$/.exec(text);
  if (tail?.[1]) {
    const octets = tail[1].split(".").map(Number);
    if (octets.length !== 4 || octets.some((n) => !Number.isInteger(n) || n > 255)) return null;
    const hi = ((octets[0] as number) << 8) | (octets[1] as number);
    const lo = ((octets[2] as number) << 8) | (octets[3] as number);
    text = `${text.slice(0, tail.index)}:${hi.toString(16)}:${lo.toString(16)}`;
  }

  const [head, rest, ...extra] = text.split("::");
  if (extra.length > 0) return null;

  const split = (part: string | undefined) =>
    part && part.length > 0 ? part.split(":") : [];

  const left = split(head);
  const right = split(rest);
  const fill = rest === undefined ? 0 : 8 - left.length - right.length;
  if (fill < 0) return null;

  const hextets = [...left, ...Array<string>(fill).fill("0"), ...right];
  if (hextets.length !== 8) return null;

  const bytes: number[] = [];
  for (const hextet of hextets) {
    const value = Number.parseInt(hextet || "0", 16);
    if (!Number.isInteger(value) || value < 0 || value > 0xffff) return null;
    bytes.push((value >> 8) & 0xff, value & 0xff);
  }
  return bytes;
}

function ipv6Private(address: string): boolean {
  const b = ipv6Bytes(address);
  if (!b) return true;

  const allZero = b.every((byte) => byte === 0);
  if (allZero) return true;
  if (b.slice(0, 15).every((byte) => byte === 0) && b[15] === 1) return true;

  const mapped =
    b.slice(0, 10).every((byte) => byte === 0) && b[10] === 0xff && b[11] === 0xff;
  const translated = b[0] === 0x00 && b[1] === 0x64 && b[2] === 0xff && b[3] === 0x9b;
  if (mapped || translated) {
    return ipv4Private(`${b[12]}.${b[13]}.${b[14]}.${b[15]}`);
  }

  if (((b[0] as number) & 0xfe) === 0xfc) return true;
  if (b[0] === 0xfe && ((b[1] as number) & 0xc0) === 0x80) return true;
  if (b[0] === 0xff) return true;
  if (b[0] === 0x20 && b[1] === 0x01 && b[2] === 0x0d && b[3] === 0xb8) return true;
  if (b[0] === 0x01 && b[1] === 0x00 && b.slice(2, 8).every((x) => x === 0)) return true;

  return false;
}

export function isPublicAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) return !ipv4Private(address);
  if (family === 6) return !ipv6Private(address);
  return false;
}
