import { mkdtemp, writeFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { BadRequestException } from '@nestjs/common';
import { assertAllowedFileSignature } from './upload.utils';

describe('upload utils', () => {
  it('accepts jpeg signatures from an in-memory buffer', async () => {
    await expect(
      assertAllowedFileSignature(
        {
          buffer: Buffer.from('ffd8ffe000104a464946', 'hex'),
        },
        ['jpeg'],
      ),
    ).resolves.toBeUndefined();
  });

  it('accepts webp signatures from a temp file path', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'docita-upload-utils-'));
    const filePath = join(tempDir, 'sample.webp');

    try {
      await writeFile(filePath, Buffer.from('524946460000000057454250', 'hex'));

      await expect(
        assertAllowedFileSignature(
          {
            path: filePath,
          },
          ['webp'],
        ),
      ).resolves.toBeUndefined();
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('rejects invalid file signatures', async () => {
    await expect(
      assertAllowedFileSignature(
        {
          buffer: Buffer.from('00112233445566778899aabb', 'hex'),
        },
        ['png'],
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
