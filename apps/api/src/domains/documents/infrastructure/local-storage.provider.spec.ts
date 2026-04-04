import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from '@jest/globals';
import { LocalStorageProvider } from './local-storage.provider';

describe('LocalStorageProvider', () => {
  const provider = new LocalStorageProvider();

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
});
