import { Logger } from "./Logger.ts";

export class Credential {
  private cryptoKey: CryptoKey;
  private creds: DecryptedCredential<unknown>[] = [];
  private credsFile: string;

  private constructor(key: CryptoKey, credsFile: string) {
    this.cryptoKey = key;
    this.credsFile = credsFile;
  }

  static async create(secret: string, credsFile: string): Promise<Credential> {
    const enc = new TextEncoder().encode(secret);

    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      enc,
      "PBKDF2",
      false,
      ["deriveKey"]
    );

    const key = await crypto.subtle.deriveKey(
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

    const credManager = new Credential(key, credsFile);
    Logger.info('Importing credentials...')

    const raw = JSON.parse(await Deno.readTextFile(credsFile));
    await credManager.import(raw);

    return credManager;
  }

  private async import(creds: EncryptedCredential[]) {
    this.creds = await Promise.all(
      creds.map(async cred => ({
        ...cred,
        data: await this.decrypt<unknown>(cred.data),
      }))
    );
  }


  private export(): Promise<EncryptedCredential[]> {
    return Promise.all(
      this.creds.map(async cred => ({
        ...cred,
        data: await this.encrypt(cred.data),
      }))
    );
  }

  private async decrypt<T>(blobB64: string): Promise<T> {
    const raw = Uint8Array.from(atob(blobB64), (c) => c.charCodeAt(0));

    const iv = raw.slice(0, 12);
    const ciphertext = raw.slice(12);

    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      this.cryptoKey,
      ciphertext
    );

    return JSON.parse(new TextDecoder().decode(decrypted));
  }

  private async encrypt<T>(data: T): Promise<string> {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(JSON.stringify(data));

    const ciphertext = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      this.cryptoKey,
      encoded
    );

    const combined = new Uint8Array(iv.length + ciphertext.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(ciphertext), iv.length);

    return btoa(String.fromCharCode(...combined));
  }

  getAll(): DecryptedCredential<unknown>[] {
    return this.creds;
  }

  getById<T>(id: string): DecryptedCredential<T> | undefined {
    return this.creds.find((c) => c.id === id) as DecryptedCredential<T>;
  }

  getByName<T>(name: string): DecryptedCredential<T> | undefined {
    return this.creds.find((c) => c.name === name) as DecryptedCredential<T>;
  }

  set<T>(cred: DecryptedCredential<T>) {
    const idx = this.creds.findIndex((c) => c.id === cred.id);
    if (idx >= 0) this.creds[idx] = cred;
    else this.creds.push(cred);
  }

  saveToFile(creds_file: string = this.credsFile): Promise<void> {
    return this.export().then((exported) =>
      Deno.writeTextFile(creds_file, JSON.stringify(exported, null, 2))
    );
  }

}

export type CredentialBase = {
  id: string;
  name: string;
  createdAt: string;
};

export type EncryptedCredential = CredentialBase & {
  data: string; // base64(iv + ciphertext)
};

export type DecryptedCredential<T> = CredentialBase & {
  data: T;
};