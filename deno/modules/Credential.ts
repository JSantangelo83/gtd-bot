// modules/Credential.ts
export type RawCredential = {
  id: string;
  name: string;
  type: string;
  isManaged: boolean;
  createdAt: string;
  updatedAt: string;
  data: {
    iv: string;          // base64
    ciphertext: string;  // base64
  };
};

export type DecryptedCredential<T> = {
  id: string;
  name: string;
  type: string;
  isManaged: boolean;
  createdAt: string;
  updatedAt: string;
  data: T
};

export class Credential {
  private cryptoKey: CryptoKey;
  private creds: DecryptedCredential<unknown>[] = [];

  private constructor(key: CryptoKey) {
    this.cryptoKey = key;
  }

  // Key derivation (PBKDF2 → AES-GCM 256)
  static async fromKey(secret: string): Promise<Credential> {
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

    return new Credential(key);
  }

  // INTERNAL: decrypt AES-GCM
  private async decrypt(ivB64: string, cipherB64: string): Promise<string> {
    const iv = Uint8Array.from(atob(ivB64), (c) => c.charCodeAt(0));
    const ciphertext = Uint8Array.from(atob(cipherB64), (c) => c.charCodeAt(0));

    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      this.cryptoKey,
      ciphertext
    );

    return new TextDecoder().decode(decrypted);
  }

  // INTERNAL: encrypt AES-GCM (not required for import, but useful)
  async encrypt(value: string) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(value);

    const ciphertext = new Uint8Array(
      await crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        this.cryptoKey,
        encoded
      )
    );

    return {
      iv: btoa(String.fromCharCode(...iv)),
      ciphertext: btoa(String.fromCharCode(...ciphertext)),
    };
  }

  // IMPORT: takes the JSON array ready from file
  async import(raw: RawCredential[]) {
    this.creds = [];

    for (const item of raw) {
      const decrypted = await this.decrypt(
        item.data.iv,
        item.data.ciphertext
      );

      this.creds.push({
        ...item,
        data: JSON.parse(decrypted),
      });
    }
  }

  // GET ALL DECRYPTED CREDS
  getAll(): DecryptedCredential<unknown>[] {
    return this.creds;
  }

  // GET by ID
  getById(id: string) {
    return this.creds.find(c => c.id === id);
  }

  // GET by name
  getByName(name: string) {
    return this.creds.find(c => c.name === name);
  }

}
