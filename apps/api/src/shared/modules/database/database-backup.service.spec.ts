import { describe, expect, it, jest } from '@jest/globals';
import { DatabaseBackupService } from './database-backup.service';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';

function createConfigService(): AppConfigService {
  const configService = Object.create(
    AppConfigService.prototype,
  ) as AppConfigService;
  configService.getDatabaseUrl = jest
    .fn<() => string>()
    .mockReturnValue('postgresql://user:password@localhost:5434/docita');
  return configService;
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
