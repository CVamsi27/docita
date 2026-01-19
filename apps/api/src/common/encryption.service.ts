/**
 * Data Encryption Utilities for DPDP Compliance
 * Provides field-level encryption for sensitive patient data
 */

import * as crypto from 'crypto';
import { Patient } from '@workspace/types';
import { Logger } from '@nestjs/common';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const TAG_LENGTH = 16; // 128 bits

export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);
  private encryptionKey: Buffer;

  constructor() {
    // In production, load from secure environment variable or key management service
    const key = process.env.ENCRYPTION_KEY || this.generateKey();
    this.encryptionKey = Buffer.from(key, 'hex');
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
   * @returns Encrypted data with IV and auth tag
   */
  encrypt(plaintext: string): string {
    if (!plaintext) return plaintext;

    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, this.encryptionKey, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Format: iv:authTag:encryptedData
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypt encrypted data
   * @param encryptedData - Data to decrypt (format: iv:authTag:encryptedData)
   * @returns Decrypted plaintext
   */
  decrypt(encryptedData: string): string {
    if (!encryptedData || !encryptedData.includes(':')) return encryptedData;

    try {
      const parts = encryptedData.split(':');
      if (parts.length !== 3) return encryptedData;

      const [ivHex, authTagHex, encrypted] = parts;

      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');

      const decipher = crypto.createDecipheriv(
        ALGORITHM,
        this.encryptionKey,
        iv,
      );
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      this.logger.error('Decryption failed', error);
      return encryptedData; // Return original if decryption fails
    }
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

export const encryptionService = new EncryptionService();
