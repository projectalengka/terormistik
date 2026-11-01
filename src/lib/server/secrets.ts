import "server-only";

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), ".data");
const KEYS_FILE = path.join(DATA_DIR, "keys.json");
const LOCAL_SECRET_FILE = path.join(DATA_DIR, ".cipher-key");

export type ProviderId = "openrouter" | "gemini" | "groq";

const ENV_KEYS: Record<ProviderId, string[]> = {
  openrouter: ["OPENROUTER_API_KEY"],
  gemini: ["GEMINI_API_KEY", "GOOGLE_API_KEY", "GOOGLE_GENERATIVE_AI_API_KEY"],
  groq: ["GROQ_API_KEY"],
};

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function getCipherKey(): Promise<Buffer> {
  if (process.env.TEROR_SECRET_KEY) {
    return crypto.createHash("sha256").update(process.env.TEROR_SECRET_KEY).digest();
  }
  await ensureDataDir();
  try {
    const existing = await fs.readFile(LOCAL_SECRET_FILE, "utf8");
    const trimmed = existing.trim();
    if (trimmed.length === 64) return Buffer.from(trimmed, "hex");
  } catch {
    /* generate below */
  }
  const generated = crypto.randomBytes(32).toString("hex");
  await fs.writeFile(LOCAL_SECRET_FILE, generated, { mode: 0o600 });
  return Buffer.from(generated, "hex");
}

function encrypt(value: string, key: Buffer): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString("base64url")}.${tag.toString("base64url")}.${enc.toString("base64url")}`;
}

function decrypt(payload: string, key: Buffer): string | null {
  try {
    const [version, ivB64, tagB64, dataB64] = payload.split(".");
    if (version !== "v1") return null;
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      key,
      Buffer.from(ivB64, "base64url")
    );
    decipher.setAuthTag(Buffer.from(tagB64, "base64url"));
    const dec = Buffer.concat([
      decipher.update(Buffer.from(dataB64, "base64url")),
      decipher.final(),
    ]);
    return dec.toString("utf8");
  } catch {
    return null;
  }
}

type StoredKeys = Partial<Record<ProviderId, string>>;

async function readStore(): Promise<StoredKeys> {
  try {
    const raw = await fs.readFile(KEYS_FILE, "utf8");
    const parsed = JSON.parse(raw) as StoredKeys;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

async function writeStore(store: StoredKeys) {
  await ensureDataDir();
  await fs.writeFile(KEYS_FILE, JSON.stringify(store, null, 2), { mode: 0o600 });
}

export function envKey(provider: ProviderId): string | null {
  for (const name of ENV_KEYS[provider]) {
    const value = process.env[name];
    if (value && value.trim().length > 0) return value.trim();
  }
  return null;
}

export async function storedKey(provider: ProviderId): Promise<string | null> {
  const store = await readStore();
  const encrypted = store[provider];
  if (!encrypted) return null;
  const key = await getCipherKey();
  return decrypt(encrypted, key);
}

export async function resolveKey(
  provider: ProviderId
): Promise<{ key: string | null; source: "env" | "stored" | null }> {
  const fromEnv = envKey(provider);
  if (fromEnv) return { key: fromEnv, source: "env" };
  const fromStore = await storedKey(provider);
  if (fromStore) return { key: fromStore, source: "stored" };
  return { key: null, source: null };
}

export async function saveKey(provider: ProviderId, key: string): Promise<void> {
  const store = await readStore();
  const cipherKey = await getCipherKey();
  store[provider] = encrypt(key.trim(), cipherKey);
  await writeStore(store);
}

export async function removeKey(provider: ProviderId): Promise<void> {
  const store = await readStore();
  delete store[provider];
  await writeStore(store);
}

export async function keysWritable(): Promise<boolean> {
  try {
    await ensureDataDir();
    await fs.access(DATA_DIR, fs.constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

export function maskKey(key: string): string {
  if (key.length <= 8) return "••••";
  return `${key.slice(0, 4)}••••${key.slice(-4)}`;
}
