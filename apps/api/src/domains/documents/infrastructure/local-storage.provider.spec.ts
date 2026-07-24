import { BadRequestException } from '@nestjs/common';
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from '@jest/globals';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import sharp from 'sharp';
import { LocalStorageProvider } from './local-storage.provider';

describe('LocalStorageProvider', () => {
  let signaturePng: Buffer;

  beforeAll(async () => {
    signaturePng = await sharp({
      create: {
        width: 8,
        height: 8,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 1 },
      },
    })
      .png()
      .toBuffer();
  });

  let tempRoot: string;
  let provider: LocalStorageProvider;

  beforeEach(() => {
    tempRoot = mkdtempSync(join(tmpdir(), 'docita-local-storage-'));
    provider = new LocalStorageProvider({
      rootDir: tempRoot,
      apiUrl: 'http://localhost:3001/api/v1',
    });
  });

  afterEach(() => {
    rmSync(tempRoot, { recursive: true, force: true });
  });

  it('rejects traversal paths on delete', async () => {
    await expect(provider.delete('/uploads/../../etc/passwd')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rejects encoded traversal paths on delete', async () => {
    await expect(
      provider.delete('/uploads/%2e%2e/%2e%2e/etc/passwd'),
    ).rejects.toThrow(BadRequestException);
  });

  it('stores uploaded images in the local upload directory', async () => {
    const url = await provider.upload(
      {
        fieldname: 'file',
        originalname: 'signature.png',
        encoding: '7bit',
        mimetype: 'image/png',
        size: signaturePng.length,
        buffer: signaturePng,
      },
      'signatures',
    );

    expect(url).toMatch(/^\/uploads\/signatures\/.+\.png$/);
    const relativePath = url.replace(/^\/uploads\//, '');
    const filePath = join(tempRoot, relativePath);
    expect(existsSync(filePath)).toBe(true);
  });

  it('stores uploaded buffers and returns browser-safe signed urls', async () => {
    const objectKey = await provider.uploadBuffer(
      Buffer.from('pdf-bytes'),
      'pdfs/invoices/invoice-1.pdf',
      'application/pdf',
    );

    expect(objectKey).toBe('pdfs/invoices/invoice-1.pdf');
    const filePath = join(tempRoot, objectKey);
    expect(existsSync(filePath)).toBe(true);
    expect(readFileSync(filePath, 'utf8')).toBe('pdf-bytes');

    await expect(provider.generateSignedUrl(objectKey, 3600)).resolves.toBe(
      'http://localhost:3001/uploads/pdfs/invoices/invoice-1.pdf',
    );
  });

  it('deletes files referenced by absolute urls', async () => {
    const objectKey = await provider.uploadBuffer(
      Buffer.from('delete-me'),
      'pdfs/invoices/invoice-delete.pdf',
      'application/pdf',
    );
    const filePath = join(tempRoot, objectKey);
    expect(existsSync(filePath)).toBe(true);

    await provider.delete(
      'http://localhost:3001/uploads/pdfs/invoices/invoice-delete.pdf',
    );

    expect(existsSync(filePath)).toBe(false);
  });
});
