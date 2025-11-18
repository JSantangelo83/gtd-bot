
node <<'EOF'
const fs = require("fs");
const { execSync } = require("child_process");

const oldPass = "wtcTztceoaGxzqymHHer7txTq16LXIUT"
const newPass = "wtcTztceoaGxzqymHHer7txTq16LXIUT"

const credentials = JSON.parse(fs.readFileSync("credentials.json", "utf8"));

async function importKey(password) {
  const enc = new TextEncoder().encode(password);
  const keyMaterial = await crypto.subtle.importKey("raw", enc, { name: "PBKDF2" }, false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: new Uint8Array([1,2,3]), iterations: 10000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"]
  );
}

async function encryptValue(key, plaintext) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded));

  return {
    iv: Buffer.from(iv).toString("base64"),
    ciphertext: Buffer.from(encrypted).toString("base64"),
  };
}

(async () => {
  const aesKey = await importKey(newPass);

  for (const cred of credentials) {
    const encrypted = cred.data;

  const decrypted = execSync(
    `echo "${encrypted}" | base64 -d | openssl enc -aes-256-cbc -md md5 -d -salt -pass pass:${oldPass}`,
    { encoding: "utf8" }
  ).trim();

    const newEnc = await encryptValue(aesKey, decrypted);

    cred.data = newEnc;
  }

  fs.writeFileSync("new_credentials.json", JSON.stringify(credentials, null, 2));
  console.log("✓ Migration complete → new_credentials.json");
})();
EOF
