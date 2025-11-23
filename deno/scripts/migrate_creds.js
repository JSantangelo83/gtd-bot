const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const inFile = process.argv[2];
const outFile = process.argv[3];

if (!inFile || !outFile) {
  console.error("Usage: migrate.js <input.json> <output.json>");
  process.exit(1);
}

const scriptDir = path.dirname(fs.realpathSync(process.argv[1]));
const envPath = path.resolve(scriptDir, "../.env");

if (!fs.existsSync(envPath)) {
  console.error(`.env not found at: ${envPath}`);
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, "utf8");
const match = envContent.match(/^ENCRYPTION_KEY=(.+)$/m);

if (!match) {
  console.error("ENCRYPTION_KEY not found in .env");
  process.exit(1);
}

const newPass = match[1].trim();

const oldPass = newPass; 

if (!fs.existsSync(inFile)) {
  console.error(`Input file does not exist: ${inFile}`);
  process.exit(1);
}

let credentials;
try {
  credentials = JSON.parse(fs.readFileSync(inFile, "utf8"));
} catch (err) {
  console.error(`Failed to read or parse input file: ${inFile}`);
  console.error(err.message);
  process.exit(1);
}


async function importKey(password) {
  const enc = new TextEncoder().encode(password);
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc,
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: new Uint8Array([1,2,3]),
      iterations: 10000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"]
  );
}

async function encryptValue(key, plaintext) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded)
  );

  return {
    iv: Buffer.from(iv).toString("base64"),
    ciphertext: Buffer.from(encrypted).toString("base64"),
  };
}

(async () => {
  console.log("🔄 Upgrading credential encryption: OpenSSL-CBC → WebCrypto-GCM")
  const aesKey = await importKey(newPass);

  for (const cred of credentials) {
    console.log(`🟦 Processing ${cred.name} (${cred.id})`);

    const encrypted = cred.data;

    console.log(`   🔓 Decrypting ${cred.name}...`);
    let decrypted = execSync(
      `echo "${encrypted}" | base64 -d | openssl enc -aes-256-cbc -md md5 -d -salt -pass pass:${oldPass} 2>/dev/null`,
      { encoding: "utf8", shell: "/bin/bash" }
    ).trim();
    console.log(decrypted)
    console.log(`   🔐 Encrypting ${cred.name}...`);
    const newEnc = await encryptValue(aesKey, decrypted);

    cred.data = newEnc;
  }

  fs.writeFileSync(outFile, JSON.stringify(credentials, null, 2));
  console.log(`\n✅ Migration complete: ${outFile}`);
})();
