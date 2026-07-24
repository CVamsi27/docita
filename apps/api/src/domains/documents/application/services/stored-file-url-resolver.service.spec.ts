import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, it, expect, jest } from '@jest/globals';
import { StoredFileUrlResolverService } from './stored-file-url-resolver.service';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import {
  GENERIC_STORED_FILE_SIGNED_URL_TTL_SECONDS,
  StorageProvider,
} from '@/domains/documents/application/ports/storage-provider.port';

const API_ORIGIN = 'https://api.example.test';

function buildConfigMock(overrides: Partial<AppConfigService> = {}) {
  return {
    getApiUrl: jest
      .fn<(...args: unknown[]) => string>()
      .mockReturnValue(`${API_ORIGIN}/`),
    ...overrides,
  } as unknown as AppConfigService;
}

function buildStorageMock(overrides: Partial<StorageProvider> = {}) {
  return {
    supportsSignedUrls: false,
    upload: jest.fn(),
    delete: jest.fn(),
    uploadBuffer: jest.fn(),
    generateSignedUrl: jest
      .fn<(...args: unknown[]) => Promise<string>>()
      .mockResolvedValue('https://signed.example/obj'),
    getObject: jest.fn(),
    ...overrides,
  } as unknown as StorageProvider;
}

describe('StoredFileUrlResolverService', () => {
  let service: StoredFileUrlResolverService;
  let config: AppConfigService;
  let storage: StorageProvider;

  beforeEach(async () => {
    config = buildConfigMock();
    storage = buildStorageMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StoredFileUrlResolverService,
        { provide: AppConfigService, useValue: config },
        { provide: StorageProvider, useValue: storage },
      ],
    }).compile();

    service = module.get<StoredFileUrlResolverService>(
      StoredFileUrlResolverService,
    );
  });

  describe('nullish and empty inputs', () => {
    it.each([
      ['null', null],
      ['undefined', undefined],
      ['empty string', ''],
      ['whitespace-only', '   '],
    ])('returns both nulls for %s', async (_label, input) => {
      const result = await service.resolveWithStoredUrl(input);
      expect(result).toEqual({ url: null, storedUrl: null });
    });

    it('resolve() mirrors resolveWithStoredUrl().url', async () => {
      const result = await service.resolve(null);
      expect(result).toBeNull();
    });
  });

  describe('passthrough inputs', () => {
    it('returns absolute http urls unchanged in both fields', async () => {
      const url = 'https://cdn.example.com/file.pdf';
      const result = await service.resolveWithStoredUrl(url);
      expect(result).toEqual({ url, storedUrl: url });
    });

    it('returns https urls unchanged', async () => {
      const url = 'https://example.com/file';
      const result = await service.resolveWithStoredUrl(url);
      expect(result).toEqual({ url, storedUrl: url });
    });

    it('returns data: urls unchanged', async () => {
      const url = 'data:image/png;base64,iVBORw0KGgo=';
      const result = await service.resolveWithStoredUrl(url);
      expect(result).toEqual({ url, storedUrl: url });
    });

    it('returns blob: urls unchanged', async () => {
      const url = 'blob:https://example.com/abc-123';
      const result = await service.resolveWithStoredUrl(url);
      expect(result).toEqual({ url, storedUrl: url });
    });
  });

  describe('API-relative paths', () => {
    it('resolves /uploads/ paths to the configured API origin', async () => {
      const result = await service.resolveWithStoredUrl('/uploads/file.pdf');
      expect(result).toEqual({
        url: `${API_ORIGIN}/uploads/file.pdf`,
        storedUrl: '/uploads/file.pdf',
      });
    });

    it('normalizes uploads/ (no leading slash) and resolves to origin', async () => {
      const result = await service.resolveWithStoredUrl('uploads/file.pdf');
      expect(result).toEqual({
        url: `${API_ORIGIN}/uploads/file.pdf`,
        storedUrl: '/uploads/file.pdf',
      });
    });

    it('resolves any other /-prefixed path to the API origin', async () => {
      const result = await service.resolveWithStoredUrl('/api/files/abc');
      expect(result).toEqual({
        url: `${API_ORIGIN}/api/files/abc`,
        storedUrl: '/api/files/abc',
      });
    });
  });

  describe('object keys (not path-shaped)', () => {
    it('uses generateSignedUrl when the storage provider supports it', async () => {
      const signed = 'https://r2.example.com/signed-token';
      storage = buildStorageMock({
        supportsSignedUrls: true,
        generateSignedUrl: jest
          .fn<(...args: unknown[]) => Promise<string>>()
          .mockResolvedValue(signed),
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          StoredFileUrlResolverService,
          { provide: AppConfigService, useValue: config },
          { provide: StorageProvider, useValue: storage },
        ],
      }).compile();
      service = module.get<StoredFileUrlResolverService>(
        StoredFileUrlResolverService,
      );

      const objectKey = 'templates/clinic-1/tpl.pdf';
      const result = await service.resolveWithStoredUrl(objectKey);

      expect(storage.generateSignedUrl).toHaveBeenCalledWith(
        objectKey,
        GENERIC_STORED_FILE_SIGNED_URL_TTL_SECONDS,
      );
      expect(result).toEqual({ url: signed, storedUrl: objectKey });
    });

    it('falls back to /uploads/<key> when signed urls are not supported', async () => {
      // storage has supportsSignedUrls: false (default in buildStorageMock)
      const objectKey = 'templates/clinic-1/tpl.pdf';
      const result = await service.resolveWithStoredUrl(objectKey);

      expect(storage.generateSignedUrl).not.toHaveBeenCalled();
      expect(result).toEqual({
        url: `${API_ORIGIN}/uploads/${objectKey}`,
        storedUrl: objectKey,
      });
    });
  });

  describe('config with bad URL falls back gracefully', () => {
    it('uses the raw value as origin when getApiUrl() is not a parseable URL', async () => {
      config = buildConfigMock({ getApiUrl: (() => 'not-a-url') as never });
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          StoredFileUrlResolverService,
          { provide: AppConfigService, useValue: config },
          { provide: StorageProvider, useValue: storage },
        ],
      }).compile();
      service = module.get<StoredFileUrlResolverService>(
        StoredFileUrlResolverService,
      );

      const result = await service.resolveWithStoredUrl('/uploads/file.pdf');
      expect(result.url).toBe('not-a-url/uploads/file.pdf');
      expect(result.storedUrl).toBe('/uploads/file.pdf');
    });
  });
});
