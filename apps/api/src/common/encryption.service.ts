/**
 * Data Encryption Utilities for DPDP Compliance
 * Provides field-level encryption for sensitive patient data
 */

import * as crypto from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const TAG_LENGTH = 16; // 128 bits

@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);
  private encryptionKey: Buffer; // Current key for encryption
  private keyVersions: Map<string, Buffer> = new Map(); // Historical keys for decryption
  private currentKeyVersion: string = 'v1'; // Current key version

  constructor(private configService: ConfigService) {
    // Primary encryption key (current version)
    const key = this.configService.get<string>('ENCRYPTION_KEY');

    if (!key) {
      throw new Error(
        'CRITICAL: ENCRYPTION_KEY is not set in environment. Encryption is non-functional.',
      );
    }

    if (key.length !== 64) {
      throw new Error(
        'CRITICAL: ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes).',
      );
    }

    try {
      this.encryptionKey = Buffer.from(key, 'hex');
      this.keyVersions.set(this.currentKeyVersion, this.encryptionKey);
    } catch (error) {
      throw new Error('CRITICAL: ENCRYPTION_KEY must be a valid hex string.');
    }

    // Load historical keys for rotation support (optional)
    // Format: ENCRYPTION_KEY_V1, ENCRYPTION_KEY_V2, etc.
    const historicalKeys = ['v2', 'v3', 'v4', 'v5']; // Support up to 5 key versions
    for (const version of historicalKeys) {
      const historicalKey = this.configService.get<string>(
        `ENCRYPTION_KEY_${version.toUpperCase()}`,
      );
      if (historicalKey && historicalKey.length === 64) {
        try {
          const keyBuffer = Buffer.from(historicalKey, 'hex');
          this.keyVersions.set(version, keyBuffer);
          this.currentKeyVersion = version; // Use latest available key
          this.encryptionKey = keyBuffer; // Update current encryption key
          this.logger.log(`Loaded encryption key version: ${version}`);
        } catch (error) {
          this.logger.warn(
            `Invalid format for ENCRYPTION_KEY_${version.toUpperCase()}, skipping`,
          );
        }
      }
    }

    this.logger.log(
      `EncryptionService initialized with key version: ${this.currentKeyVersion} (${this.keyVersions.size} versions available)`,
    );
  }

  /**
   * Generate a new encryption key (for initial setup)
   */
  private generateKey(): string {
    return crypto.randomBytes(KEY_LENGTH).toString('hex');
  }

  /**
   * Encrypt sensitive data
   * @param plaintext - Data to encrypt
   * @returns Encrypted data with key version, IV and auth tag
   */
  encrypt(plaintext: string): string {
    if (!plaintext) return plaintext;

    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, this.encryptionKey, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Format: keyVersion:iv:authTag:encryptedData
    return `${this.currentKeyVersion}:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypt encrypted data
   * @param encryptedData - Data to decrypt (format: keyVersion:iv:authTag:encryptedData or legacy iv:authTag:encryptedData)
   * @returns Decrypted plaintext
   */
  decrypt(encryptedData: string): string {
    if (!encryptedData || !encryptedData.includes(':')) return encryptedData;

    try {
      const parts = encryptedData.split(':');
      let keyVersion: string;
      let ivHex: string;
      let authTagHex: string;
      let encrypted: string;

      // Detect format: versioned (4 parts) vs legacy (3 parts)
      if (parts.length === 4) {
        // New format: keyVersion:iv:authTag:encryptedData
        [keyVersion, ivHex, authTagHex, encrypted] = parts;
      } else if (parts.length === 3) {
        // Legacy format: iv:authTag:encryptedData (use first available key)
        [ivHex, authTagHex, encrypted] = parts;
        keyVersion = this.currentKeyVersion; // Try current key first
      } else {
        return encryptedData; // Invalid format
      }

      // Retrieve the appropriate decryption key
      const decryptionKey = this.keyVersions.get(keyVersion);

      if (!decryptionKey) {
        // If key version not found, try all available keys (brute-force for backward compat)
        for (const [version, key] of this.keyVersions) {
          try {
            return this.decryptWithKey(ivHex, authTagHex, encrypted, key);
          } catch {
            continue; // Try next key
          }
        }
        throw new Error(`No valid decryption key found for encrypted data`);
      }

      return this.decryptWithKey(ivHex, authTagHex, encrypted, decryptionKey);
    } catch (error) {
      this.logger.error('Decryption failed', error);
      return encryptedData; // Return original if decryption fails
    }
  }

  /**
   * Internal helper to decrypt with a specific key
   */
  private decryptWithKey(
    ivHex: string,
    authTagHex: string,
    encrypted: string,
    key: Buffer,
  ): string {
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Encrypt patient PII fields
   * @param patient - Patient object
   * @returns Patient with encrypted sensitive fields
   */
  encryptPatientData<T>(patient: T): T {
    const sensitiveFields = [
      'email',
      'phoneNumber',
      'address',
      'emergencyContactPhone',
      'emergencyContactName',
      'firstName',
      'lastName',
    ];

    const encryptedPatient = { ...patient };

    for (const field of sensitiveFields) {
      if (patient[field]) {
        encryptedPatient[field] = this.encrypt(patient[field] as string);
      }
    }

    return encryptedPatient;
  }

  /**
   * Decrypt patient PII fields
   * @param patient - Patient object with encrypted fields
   * @returns Patient with decrypted fields
   */
  decryptPatientData<T>(patient: T): T {
    const sensitiveFields = [
      'email',
      'phoneNumber',
      'address',
      'emergencyContactPhone',
      'emergencyContactName',
      'firstName',
      'lastName',
    ];

    const decryptedPatient = { ...patient };

    for (const field of sensitiveFields) {
      if (patient[field]) {
        decryptedPatient[field] = this.decrypt(patient[field] as string);
      }
    }

    return decryptedPatient;
  }

  /**
   * Hash data for anonymization
   * @param data - Data to hash
   * @returns SHA-256 hash
   */
  hash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Generate a secure random token
   * @param length - Token length in bytes (default 32)
   * @returns Random token
   */
  generateToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }
}
