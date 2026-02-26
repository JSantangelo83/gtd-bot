#!/usr/bin/env -S deno run --allow-read --allow-write

const RESET = "\x1b[0m";
const c = {
  bold: (t: string) => `\x1b[1m${t}${RESET}`,
  dim: (t: string) => `\x1b[2m${t}${RESET}`,
  red: (t: string) => `\x1b[31m${t}${RESET}`,
  green: (t: string) => `\x1b[32m${t}${RESET}`,
  yellow: (t: string) => `\x1b[33m${t}${RESET}`,
  blue: (t: string) => `\x1b[34m${t}${RESET}`,
  magenta: (t: string) => `\x1b[35m${t}${RESET}`,
  cyan: (t: string) => `\x1b[36m${t}${RESET}`,
};

function banner() {
  console.error(c.bold(c.magenta("🔐 Credentials CLI")));
  console.error(c.dim("──────────────────────────────────────────"));
}

const enc = new TextEncoder();
const dec = new TextDecoder();

const SCRIPT_DIR = new URL(".", import.meta.url);
const PROJECT_ROOT = new URL("..", SCRIPT_DIR);
const ENV_PATH = new URL(".env", PROJECT_ROOT);
const DEFAULT_CREDS_PATH = new URL("resources/credentials.json", PROJECT_ROOT);

function loadEnv(path: URL): Record<string, string> {
  try {
    const txt = Deno.readTextFileSync(path);
    const out: Record<string, string> = {};
    for (const line of txt.split("\n")) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m) out[m[1].trim()] = m[2].trim();
    }
    return out;
  } catch {
    return {};
  }
}

const env = loadEnv(ENV_PATH);
const PASS = env["ENCRYPTION_SECRET"];

if (!PASS) {
  console.error(c.red("❌ ENCRYPTION_SECRET not found in .env"));
  Deno.exit(1);
}

async function deriveKey(password: string): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: new Uint8Array([1, 2, 3]),
      iterations: 10000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function encryptValue(key: CryptoKey, plaintext: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = enc.encode(plaintext);

  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data)
  );

  const blob = new Uint8Array(iv.length + ciphertext.length);
  blob.set(iv);
  blob.set(ciphertext, iv.length);

  return btoa(String.fromCharCode(...blob));
}

async function decryptValue(key: CryptoKey, blob64: string): Promise<string> {
  const raw = Uint8Array.from(atob(blob64), (x) => x.charCodeAt(0));
  const iv = raw.slice(0, 12);
  const ct = raw.slice(12);

  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
  return dec.decode(decrypted);
}

function loadCreds(path: URL): any[] {
  try {
    return JSON.parse(Deno.readTextFileSync(path));
  } catch {
    return [];
  }
}

function saveCreds(path: URL, creds: any[]) {
  Deno.writeTextFileSync(path, JSON.stringify(creds, null, 2));
}

async function cmdNew(key: CryptoKey, name: string, file: URL) {
  console.error(c.blue(`📝 Enter credential value (Ctrl+D to finish):`));
  const input = await Deno.readAll(Deno.stdin);
  const text = dec.decode(input).trim();

  if (!text) {
    console.error(c.red("❌ Empty input, nothing stored"));
    Deno.exit(1);
  }

  const encrypted = await encryptValue(key, text);

  const creds = loadCreds(file);
  creds.push({
    id: crypto.randomUUID(),
    name,
    createdAt: new Date().toISOString(),
    data: encrypted,
  });

  saveCreds(file, creds);
  console.error(c.green(`✔ Stored credential "${name}"`));
}

async function cmdShow(key: CryptoKey, name: string, file: URL) {
  const creds = loadCreds(file);
  const cred = creds.find((c) => c.name === name);

  if (!cred) {
    console.error(c.red(`❌ Credential "${name}" not found`));
    Deno.exit(1);
  }



  const decrypted = await decryptValue(key, cred.data);
  console.log(decrypted);
}

function cmdDelete(name: string, file: URL) {
  const creds = loadCreds(file);
  const newCreds = creds.filter((c) => c.name !== name);

  if (newCreds.length === creds.length) {
    console.error(c.red(`❌ Credential "${name}" not found`));
    Deno.exit(1);
  }

  saveCreds(file, newCreds);
  console.error(c.yellow(`🗑️ Deleted credential "${name}"`));
}

function showHelp() {
  banner();
  console.error("Usage:");
  console.error("  creds-cli new <name> [file]");
  console.error("  creds-cli show <name> [file]");
  console.error("  creds-cli delete <name> [file]");
  console.error();
  console.error(c.dim(`Default file: resources/credentials.json`));
}

banner();

const [cmd, name, fileArg] = Deno.args;
const file = fileArg ? new URL(fileArg, "file:///") : DEFAULT_CREDS_PATH;
const key = await deriveKey(PASS);

switch (cmd) {
  case "new":
    if (!name) {
      console.error(c.red("❌ Missing <name>"));
      console.error();
      showHelp();
      Deno.exit(1);
    }
    await cmdNew(key, name, file);
    break;

  case "show":
    if (!name) {
      console.error(c.red("❌ Missing <name>"));
      console.error();
      showHelp();
      Deno.exit(1);
    }
    await cmdShow(key, name, file);
    break;

  case "delete":
    if (!name) {
      console.error(c.red("❌ Missing <name>"));
      console.error();
      showHelp();
      Deno.exit(1);
    }
    cmdDelete(name, file);
    break;

  default:
    showHelp();
    break;
}
