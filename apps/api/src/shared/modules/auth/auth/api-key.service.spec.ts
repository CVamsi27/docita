import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { PrismaService } from '@/prisma/prisma.service';
import { asType, createFixedClockMock } from '@/test-utils';
import { ApiKeyService } from './api-key.service';

describe('ApiKeyService', () => {
  let prisma: {
    $transaction: <T>(fn: (tx: unknown) => Promise<T>) => Promise<T>;
    apiKey: {
      create: jest.MockedFunction<(...args: unknown[]) => Promise<unknown>>;
      findMany: jest.MockedFunction<(...args: unknown[]) => Promise<unknown>>;
      findUnique: jest.MockedFunction<(...args: unknown[]) => Promise<unknown>>;
      update: jest.MockedFunction<(...args: unknown[]) => Promise<unknown>>;
    };
  };
  let service: ApiKeyService;

  beforeEach(() => {
    prisma = {
      $transaction: async (fn) => fn(prisma),
      apiKey: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };
    service = new ApiKeyService(
      asType<PrismaService>(prisma),
      createFixedClockMock(),
    );
  });

  it('creates API key and returns the secret once', async () => {
    jest.spyOn(prisma.apiKey, 'create').mockResolvedValue({
      id: 'key-1',
      name: 'Integration Key',
      keyPrefix: 'dct_abcdefgh',
      scopes: ['patients:read'],
      allowedIps: [],
      expiresAt: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    const result = await service.createApiKey('clinic-1', 'user-1', {
      name: 'Integration Key',
      scopes: ['patients:read'],
    });

    expect(result.id).toBe('key-1');
    expect(result.name).toBe('Integration Key');
    expect(result.key.startsWith('dct_')).toBe(true);
    expect(result.keyPrefix.startsWith('dct_')).toBe(true);
    expect(prisma.apiKey.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        clinicId: 'clinic-1',
        createdById: 'user-1',
        name: 'Integration Key',
        keyHash: expect.any(String),
        keyPrefix: expect.any(String),
        scopes: ['patients:read'],
        allowedIps: [],
        expiresAt: null,
        updatedAt: expect.any(Date),
      }),
    });
  });

  it('lists only active API keys for a clinic', async () => {
    jest.spyOn(prisma.apiKey, 'findMany').mockResolvedValue([{ id: 'key-1' }]);

    const result = await service.listApiKeys('clinic-1');

    expect(result).toEqual([{ id: 'key-1' }]);
    expect(prisma.apiKey.findMany).toHaveBeenCalledWith({
      where: { clinicId: 'clinic-1', revokedAt: null },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        scopes: true,
        allowedIps: true,
        expiresAt: true,
        lastUsedAt: true,
        createdAt: true,
        createdBy: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('rotates an API key with a bounded overlap window', async () => {
    const now = new Date('2026-01-15T12:00:00.000Z');
    jest.spyOn(prisma.apiKey, 'findUnique').mockResolvedValue({
      id: 'key-1',
      clinicId: 'clinic-1',
      name: 'Partner',
      scopes: ['patients:read'],
      allowedIps: ['203.0.113.10'],
      expiresAt: null,
      revokedAt: null,
    });
    jest.spyOn(prisma.apiKey, 'create').mockResolvedValue({
      id: 'key-2',
      name: 'Partner',
      keyPrefix: 'dct_replaced',
      scopes: ['patients:read'],
      allowedIps: ['203.0.113.10'],
      expiresAt: null,
      createdAt: now,
    });
    jest.spyOn(prisma.apiKey, 'update').mockResolvedValue({ id: 'key-1' });

    const result = await service.rotateApiKey(
      'key-1',
      'clinic-1',
      'user-1',
      60,
    );

    expect(result.id).toBe('key-2');
    expect(result.key.startsWith('dct_')).toBe(true);
    expect(result.previousKeyValidUntil).toEqual(
      new Date('2026-01-15T13:00:00.000Z'),
    );
    expect(prisma.apiKey.update).toHaveBeenCalledWith({
      where: { id: 'key-1' },
      data: {
        expiresAt: new Date('2026-01-15T13:00:00.000Z'),
        revokedAt: null,
        updatedAt: now,
      },
    });
  });

  it('throws NotFoundException when revoking unknown key', async () => {
    jest.spyOn(prisma.apiKey, 'findUnique').mockResolvedValue(null);

    await expect(service.revokeApiKey('key-1', 'clinic-1')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('throws ForbiddenException when key is already revoked', async () => {
    jest.spyOn(prisma.apiKey, 'findUnique').mockResolvedValue({
      id: 'key-1',
      clinicId: 'clinic-1',
      revokedAt: new Date(),
    });

    await expect(service.revokeApiKey('key-1', 'clinic-1')).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('revokes active key for matching clinic', async () => {
    jest.spyOn(prisma.apiKey, 'findUnique').mockResolvedValue({
      id: 'key-1',
      clinicId: 'clinic-1',
      revokedAt: null,
    });
    jest.spyOn(prisma.apiKey, 'update').mockResolvedValue({ id: 'key-1' });

    await expect(
      service.revokeApiKey('key-1', 'clinic-1'),
    ).resolves.toBeUndefined();
    expect(prisma.apiKey.update).toHaveBeenCalledWith({
      where: { id: 'key-1' },
      data: { revokedAt: expect.any(Date), updatedAt: expect.any(Date) },
    });
  });

  it('returns null for invalid key prefix', async () => {
    const result = await service.validateApiKey('invalid-key');

    expect(result).toBeNull();
    expect(prisma.apiKey.findUnique).not.toHaveBeenCalled();
  });

  it('returns null for unknown, revoked, or expired API keys', async () => {
    jest.spyOn(prisma.apiKey, 'findUnique').mockResolvedValueOnce(null);

    await expect(service.validateApiKey('dct_unknown')).resolves.toBeNull();

    jest.spyOn(prisma.apiKey, 'findUnique').mockResolvedValueOnce({
      id: 'key-1',
      clinicId: 'clinic-1',
      scopes: ['patients:read'],
      allowedIps: [],
      revokedAt: new Date(),
      expiresAt: null,
    });
    await expect(service.validateApiKey('dct_revoked')).resolves.toBeNull();

    jest.spyOn(prisma.apiKey, 'findUnique').mockResolvedValueOnce({
      id: 'key-1',
      clinicId: 'clinic-1',
      scopes: ['patients:read'],
      allowedIps: [],
      revokedAt: null,
      expiresAt: new Date('2026-01-01T00:00:00.000Z'),
    });
    await expect(service.validateApiKey('dct_expired')).resolves.toBeNull();
  });

  it('returns clinic and scopes for valid API key and updates last used timestamp', async () => {
    jest.spyOn(prisma.apiKey, 'findUnique').mockResolvedValue({
      id: 'key-1',
      clinicId: 'clinic-1',
      scopes: ['patients:read', 'appointments:write'],
      allowedIps: [],
      revokedAt: null,
      expiresAt: new Date('2027-01-01T00:00:00.000Z'),
    });
    jest.spyOn(prisma.apiKey, 'update').mockResolvedValue({ id: 'key-1' });

    const result = await service.validateApiKey('dct_validKey');

    expect(result).toEqual({
      clinicId: 'clinic-1',
      scopes: ['patients:read', 'appointments:write'],
    });
    expect(prisma.apiKey.update).toHaveBeenCalledWith({
      where: { id: 'key-1' },
      data: { lastUsedAt: expect.any(Date), updatedAt: expect.any(Date) },
    });
  });

  it('rejects a valid key used outside its IP allowlist', async () => {
    jest.spyOn(prisma.apiKey, 'findUnique').mockResolvedValue({
      id: 'key-1',
      clinicId: 'clinic-1',
      scopes: ['patients:read'],
      allowedIps: ['203.0.113.10'],
      revokedAt: null,
      expiresAt: null,
    });

    await expect(
      service.validateApiKey('dct_validKey', '203.0.113.11'),
    ).resolves.toBeNull();
    expect(prisma.apiKey.update).not.toHaveBeenCalled();
  });
});
