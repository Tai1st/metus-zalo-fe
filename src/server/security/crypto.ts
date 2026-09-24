import "server-only";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

/**
 * Symmetric encryption for account cookies at rest.
 *
 * Key source, in order:
 *  1. process.env.METUS_ZALO_SECRET (any string; hashed to 32 bytes)
 *  2. data/.secret-key (auto-generated once, 0600) — dev convenience
 */
const DATA_DIR = path.join(process.cwd(), "data");
const KEY_FILE = path.join(DATA_DIR, ".secret-key");

function loadKey(): Buffer {
  const fromEnv = process.env.METUS_ZALO_SECRET;
  if (fromEnv && fromEnv.length > 0) {
    return crypto.createHash("sha256").update(fromEnv).digest();
  }
  fs.mkdirSync(DATA_DIR, { recursive: true });
  try {
    return Buffer.from(fs.readFileSync(KEY_FILE, "utf8").trim(), "hex");
  } catch {
    const key = crypto.randomBytes(32);
    fs.writeFileSync(KEY_FILE, key.toString("hex"), { mode: 0o600 });
    return key;
  }
}

const KEY = loadKey();

export function encrypt(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", KEY, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  // iv(12) | tag(16) | ciphertext
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

export function decrypt(payload: string): string {
  const raw = Buffer.from(payload, "base64");
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const enc = raw.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", KEY, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}
