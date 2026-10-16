import { Logger } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { EncryptionService } from './encryption.service';

const ORIGINAL_KEY = '11'.repeat(32);
const SECOND_KEY = '22'.repeat(32);
const THIRD_KEY = '33'.repeat(32);
const CURRENT_KEY = '44'.repeat(32);
const SYNTHETIC_VALUE = 'Synthetic recovery fixture';

describe('EncryptionService authenticated key rotation', () => {
  const modules: TestingModule[] = [];

  async function createService(
    currentKey: string,
    historicalKeys: Record<string, string | undefined> = {},
  ): Promise<EncryptionService> {
    const module = await Test.createTestingModule({
      providers: [
        EncryptionService,
        {
          provide: AppConfigService,
          useValue: {
            getEncryptionKey: () => currentKey,
            getHistoricalEncryptionKeys: () => historicalKeys,
          },
        },
      ],
    }).compile();
    modules.push(module);
    return module.get(EncryptionService);
  }

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(async () => {
    await Promise.all(modules.splice(0).map((module) => module.close()));
    jest.restoreAllMocks();
  });

  it('decrypts existing v1 ciphertext after its key moves to a historical slot', async () => {
    const previous = await createService(ORIGINAL_KEY);
    const ciphertext = previous.encrypt(SYNTHETIC_VALUE);
    const rotated = await createService(CURRENT_KEY, { v2: ORIGINAL_KEY });

    expect(rotated.decrypt(ciphertext)).toBe(SYNTHETIC_VALUE);
  });

  it('preserves the current v1 write format and authenticated roundtrip', async () => {
    const service = await createService(CURRENT_KEY, { v2: ORIGINAL_KEY });
    const ciphertext = service.encrypt(SYNTHETIC_VALUE);

    expect(ciphertext).toMatch(/^v1:[a-f0-9]{32}:[a-f0-9]{32}:[a-f0-9]+$/);
    expect(service.decrypt(ciphertext)).toBe(SYNTHETIC_VALUE);
  });

  it('decrypts legacy unversioned ciphertext after rotation', async () => {
    const previous = await createService(ORIGINAL_KEY);
    const legacy = previous
      .encrypt(SYNTHETIC_VALUE)
      .split(':')
      .slice(1)
      .join(':');
    const rotated = await createService(CURRENT_KEY, { v2: ORIGINAL_KEY });

    expect(rotated.decrypt(legacy)).toBe(SYNTHETIC_VALUE);
  });

  it('preserves authenticated fallback for an unknown version label', async () => {
    const previous = await createService(ORIGINAL_KEY);
    const ciphertext = previous.encrypt(SYNTHETIC_VALUE).replace(/^v1:/, 'v9:');
    const rotated = await createService(CURRENT_KEY, { v2: ORIGINAL_KEY });

    expect(rotated.decrypt(ciphertext)).toBe(SYNTHETIC_VALUE);
  });

  it('recovers ciphertext from several rotations with reused legacy labels', async () => {
    const values = [
      ['first synthetic value', ORIGINAL_KEY],
      ['second synthetic value', SECOND_KEY],
      ['third synthetic value', THIRD_KEY],
    ];
    const rotated = await createService(CURRENT_KEY, {
      v2: THIRD_KEY,
      v3: SECOND_KEY,
      v4: ORIGINAL_KEY,
      v5: THIRD_KEY,
    });

    for (const [value, key] of values) {
      const previous = await createService(key);
      expect(rotated.decrypt(previous.encrypt(value))).toBe(value);
    }
  });

  it('authenticates a historical value even when its preferred label has another key', async () => {
    const previous = await createService(ORIGINAL_KEY);
    const ciphertext = previous.encrypt(SYNTHETIC_VALUE).replace(/^v1:/, 'v2:');
    const rotated = await createService(CURRENT_KEY, {
      v2: SECOND_KEY,
      v3: ORIGINAL_KEY,
    });

    expect(rotated.decrypt(ciphertext)).toBe(SYNTHETIC_VALUE);
  });

  it('returns the ciphertext when no retained key authenticates it', async () => {
    const previous = await createService(ORIGINAL_KEY);
    const ciphertext = previous.encrypt(SYNTHETIC_VALUE);
    const rotated = await createService(CURRENT_KEY, { v2: SECOND_KEY });

    expect(rotated.decrypt(ciphertext)).toBe(ciphertext);
  });

  it('never returns unauthenticated plaintext after ciphertext tampering', async () => {
    const previous = await createService(ORIGINAL_KEY);
    const ciphertext = previous.encrypt(SYNTHETIC_VALUE);
    const last = ciphertext.endsWith('0') ? '1' : '0';
    const tampered = ciphertext.slice(0, -1) + last;
    const rotated = await createService(CURRENT_KEY, { v2: ORIGINAL_KEY });

    expect(rotated.decrypt(tampered)).toBe(tampered);
  });

  it('keeps final decryption failure logs free of raw errors or sensitive values', async () => {
    const previous = await createService(ORIGINAL_KEY);
    const ciphertext = previous.encrypt(SYNTHETIC_VALUE);
    const rotated = await createService(CURRENT_KEY, { v2: SECOND_KEY });
    const errors = jest.spyOn(Logger.prototype, 'error');

    rotated.decrypt(ciphertext);

    expect(errors).toHaveBeenCalledTimes(1);
    expect(errors.mock.calls[0]).toHaveLength(1);
    const logged = JSON.stringify(errors.mock.calls);
    for (const value of [
      ciphertext,
      SYNTHETIC_VALUE,
      ORIGINAL_KEY,
      CURRENT_KEY,
    ]) {
      expect(logged).not.toContain(value);
    }
  });

  it('preserves plaintext and empty-input compatibility', async () => {
    const service = await createService(CURRENT_KEY);

    expect(service.decrypt('Existing plaintext')).toBe('Existing plaintext');
    expect(service.decrypt('')).toBe('');
    expect(service.encrypt('')).toBe('');
  });
});
