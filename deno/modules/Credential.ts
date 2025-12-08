export class Credential {
  private cryptoKey: CryptoKey;
  private creds: DecryptedCredential<unknown>[] = [];

  private constructor(key: CryptoKey) {
    this.cryptoKey = key;
  }

  static async create(secret: string): Promise<Credential> {
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


  private async decrypt(blobB64: string): Promise<string> {
    const raw = Uint8Array.from(atob(blobB64), (c) => c.charCodeAt(0));

    const iv = raw.slice(0, 12);
    const ciphertext = raw.slice(12);

    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      this.cryptoKey,
      ciphertext
    );

    return new TextDecoder().decode(decrypted);
  }


  async import(raw: RawCredential[]) {
    this.creds = [];

    for (const item of raw) {
      const decryptedText = await this.decrypt(item.data);

      this.creds.push({
        ...item,
        data: JSON.parse(decryptedText),
      });
    }
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
}

export type RawCredential = {
  id: string;
  name: string;
  createdAt: string;
  data: string; // base64( iv + ciphertext )
};

export type DecryptedCredential<T> = {
  id: string;
  name: string;
  createdAt: string;
  data: T;
};
