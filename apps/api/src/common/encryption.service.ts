import * as crypto from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);
  private encryptionKey: Buffer;
  private keyVersions: Map<string, Buffer> = new Map();
  private currentKeyVersion: string = 'v1';

  constructor(private configService: ConfigService) {
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

    const historicalKeys = ['v2', 'v3', 'v4', 'v5'];
    for (const version of historicalKeys) {
      const historicalKey = this.configService.get<string>(
        `ENCRYPTION_KEY_${version.toUpperCase()}`,
      );
      if (historicalKey && historicalKey.length === 64) {
        try {
          const keyBuffer = Buffer.from(historicalKey, 'hex');
          this.keyVersions.set(version, keyBuffer);
          this.currentKeyVersion = version;
          this.encryptionKey = keyBuffer;
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

  private generateKey(): string {
    return crypto.randomBytes(KEY_LENGTH).toString('hex');
  }

  encrypt(plaintext: string): string {
    if (!plaintext) return plaintext;

    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, this.encryptionKey, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return `${this.currentKeyVersion}:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  decrypt(encryptedData: string): string {
    if (!encryptedData || !encryptedData.includes(':')) return encryptedData;

    try {
      const parts = encryptedData.split(':');
      let keyVersion: string;
      let ivHex: string;
      let authTagHex: string;
      let encrypted: string;

      if (parts.length === 4) {
        [keyVersion, ivHex, authTagHex, encrypted] = parts;
      } else if (parts.length === 3) {
        [ivHex, authTagHex, encrypted] = parts;
        keyVersion = this.currentKeyVersion;
      } else {
        return encryptedData;
      }

      const decryptionKey = this.keyVersions.get(keyVersion);

      if (!decryptionKey) {
        for (const [version, key] of this.keyVersions) {
          try {
            return this.decryptWithKey(ivHex, authTagHex, encrypted, key);
          } catch {
            continue;
          }
        }
        throw new Error(`No valid decryption key found for encrypted data`);
      }

      return this.decryptWithKey(ivHex, authTagHex, encrypted, decryptionKey);
    } catch (error) {
      this.logger.error('Decryption failed', error);
      return encryptedData;
    }
  }

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

  encryptPatientData<T extends Record<string, unknown>>(patient: T): T {
    const sensitiveFields = [
      'email',
      'phoneNumber',
      'address',
      'emergencyContactPhone',
      'emergencyContactName',
      'firstName',
      'lastName',
    ] as const;

    const encryptedPatient: T = { ...patient };

    for (const field of sensitiveFields) {
      const typedField = field as keyof T;
      const value = patient[typedField];
      if (typeof value === 'string') {
        encryptedPatient[typedField] = this.encrypt(value) as T[keyof T];
      }
    }

    return encryptedPatient;
  }

  decryptPatientData<T>(patient: T): T {
    const sensitiveFields = [
      'email',
      'phoneNumber',
      'address',
      'emergencyContactPhone',
      'emergencyContactName',
      'firstName',
      'lastName',
    ] as const;

    const decryptedPatient: T = { ...patient };

    for (const field of sensitiveFields) {
      const typedField = field as keyof T;
      const value = patient[typedField];
      if (typeof value === 'string') {
        decryptedPatient[typedField] = this.decrypt(value) as T[keyof T];
      }
    }

    return decryptedPatient;
  }

  hash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  generateToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }
}
