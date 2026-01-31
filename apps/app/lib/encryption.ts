
/**
 * Browser-side decryption utility using Web Crypto API
 * Compatible with Node.js crypto.createCipheriv('aes-256-gcm')
 */

const ALGORITHM = "AES-GCM";
const KEY_LENGTH = 256;

// Hex string to Uint8Array
const hexToBytes = (hex: string): Uint8Array => {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
};

class EncryptionService {
  private key: CryptoKey | null = null;
  private keyString: string | undefined;

  constructor() {
    this.keyString = process.env.NEXT_PUBLIC_ENCRYPTION_KEY;
  }

  private async importKey(): Promise<CryptoKey> {
    if (this.key) return this.key;

    if (!this.keyString) {
      console.warn("NEXT_PUBLIC_ENCRYPTION_KEY is not set");
      throw new Error("Encryption key not configured");
    }

    const keyBytes = hexToBytes(this.keyString);
    this.key = await window.crypto.subtle.importKey(
      "raw",
      keyBytes.buffer as ArrayBuffer,
      { name: ALGORITHM, length: KEY_LENGTH },
      false,
      ["decrypt"]
    );
    return this.key;
  }

  /**
   * Decrypts a string in format: iv:authTag:encryptedData
   */
  async decrypt(encryptedString: string): Promise<string> {
    if (!encryptedString || !encryptedString.includes(":")) {
      return encryptedString;
    }

    try {
      const parts = encryptedString.split(":");
      if (parts.length !== 3) return encryptedString;

      const [ivHex, authTagHex, encryptedHex] = parts;

      const iv = hexToBytes(ivHex);
      const authTag = hexToBytes(authTagHex);
      const encrypted = hexToBytes(encryptedHex);

      // Web Crypto AES-GCM expects the tag to be appended to the ciphertext
      const data = new Uint8Array(encrypted.length + authTag.length);
      data.set(encrypted);
      data.set(authTag, encrypted.length);

      const key = await this.importKey();
      
      const decryptedBuffer = await window.crypto.subtle.decrypt(
        {
          name: ALGORITHM,
          iv: iv as unknown as BufferSource,
        },
        key,
        data as unknown as BufferSource
      );

      return new TextDecoder().decode(decryptedBuffer);
    } catch (error) {
      console.error("Decryption failed:", error);
      // Return original string if decryption fails (fallback)
      return encryptedString;
    }
  }

  /**
   * Helper to decrypt sensitive patient fields
   */
  async decryptPatientData<T extends Record<string, unknown>>(patient: T): Promise<T> {
    if (!patient) return patient;
    
    const sensitiveFields = [
      'email',
      'phoneNumber',
      'address',
      'emergencyContactPhone',
      'emergencyContactName',
      'firstName',
      'lastName',
    ];

    const decrypted = { ...patient };
    
    // Process all fields in parallel
    await Promise.all(
      sensitiveFields.map(async (field) => {
        const value = decrypted[field];
        if (typeof value === 'string') {
          (decrypted as Record<string, unknown>)[field] = await this.decrypt(value);
        }
      })
    );

    return decrypted;
  }
}

export const encryptionService = new EncryptionService();
