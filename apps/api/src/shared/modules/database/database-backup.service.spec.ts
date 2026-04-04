import { describe, expect, it, jest } from '@jest/globals';
import { DatabaseBackupService } from './database-backup.service';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';

function createConfigService(): AppConfigService {
  return {
    getDatabaseUrl: jest
      .fn()
      .mockReturnValue('postgresql://user:password@localhost:5434/docita'),
  } as unknown as AppConfigService;
}

describe('DatabaseBackupService', () => {
  it('rejects backup filenames containing path traversal', async () => {
    const service = new DatabaseBackupService(createConfigService());

    await expect(service.createFullBackup('../evil.dump')).rejects.toThrow(
      'path segments',
    );
  });

  it('rejects verification paths outside backup directory', async () => {
    const service = new DatabaseBackupService(createConfigService());

    await expect(service.verifyBackup('../../etc/passwd')).rejects.toThrow(
      'outside the backup directory',
    );
  });
});
