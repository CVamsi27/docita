import { describe, it, expect } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';
import {
  MAX_SIGNED_URL_TTL_SECONDS,
  MIN_SIGNED_URL_TTL_SECONDS,
  StorageProvider,
} from '../application/ports/storage-provider.port';

class TestStorageProvider extends StorageProvider {
  readonly supportsSignedUrls = true;

  upload(): Promise<string> {
    return Promise.resolve('');
  }

  delete(): Promise<void> {
    return Promise.resolve();
  }

  uploadBuffer(): Promise<string> {
    return Promise.resolve('');
  }

  async generateSignedUrl(_key: string, expires: number): Promise<string> {
    const clamped = this.assertSignedUrlTtl(expires);
    return `signed?ttl=${clamped}`;
  }

  async getObject(): Promise<{ buffer: Buffer; contentType: string }> {
    return { buffer: Buffer.from(''), contentType: 'application/octet-stream' };
  }
}

describe('StorageProvider TTL clamping', () => {
  const provider = new TestStorageProvider();

  it('throws BadRequestException for non-positive or non-finite values', async () => {
    await expect(provider.generateSignedUrl('k', 0)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(provider.generateSignedUrl('k', -10)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(provider.generateSignedUrl('k', NaN)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(
      provider.generateSignedUrl('k', Number.POSITIVE_INFINITY),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('clamps below the minimum TTL', async () => {
    const url = await provider.generateSignedUrl('k', 1);
    expect(url).toBe(`signed?ttl=${MIN_SIGNED_URL_TTL_SECONDS}`);
  });

  it('clamps above the maximum TTL', async () => {
    const url = await provider.generateSignedUrl('k', 7 * 24 * 60 * 60);
    expect(url).toBe(`signed?ttl=${MAX_SIGNED_URL_TTL_SECONDS}`);
  });

  it('floors fractional values within range', async () => {
    const url = await provider.generateSignedUrl('k', 3600.7);
    expect(url).toBe('signed?ttl=3600');
  });
});
