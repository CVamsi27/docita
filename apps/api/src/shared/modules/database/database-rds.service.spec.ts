import { describe, expect, it, jest } from '@jest/globals';
import { DatabaseRdsService } from './database-rds.service';
import type { DatabaseControlConfigService } from '../config/database-control-config.service';
import type { IClock } from '@/shared/common/ports/clock.port';

const FIXED_NOW = new Date('2026-07-27T12:00:00Z');

function makeService() {
  const config = {
    getAwsRegion: jest.fn<() => string>().mockReturnValue('ap-south-1'),
    getRdsInstanceId: jest.fn<() => string>().mockReturnValue('docita-db'),
    getAwsCredentials: jest
      .fn<() => { accessKeyId: string; secretAccessKey: string } | undefined>()
      .mockReturnValue({ accessKeyId: 'AKIA', secretAccessKey: 'secret' }),
  } as unknown as DatabaseControlConfigService;
  const clock = {
    now: jest.fn<() => Date>().mockReturnValue(FIXED_NOW),
  } as unknown as IClock;
  return new DatabaseRdsService(config, clock);
}

describe('DatabaseRdsService.buildSnapshotId', () => {
  it('formats manual snapshot id as {instance}-manual-{iso}', () => {
    const svc = makeService();
    expect(svc.buildSnapshotId('manual')).toMatch(
      /^docita-db-manual-2026-07-27T12-00-00/,
    );
  });

  it('formats final snapshot id as {instance}-final-{iso}', () => {
    const svc = makeService();
    expect(svc.buildSnapshotId('final')).toMatch(
      /^docita-db-final-2026-07-27T12-00-00/,
    );
  });
});

describe('DatabaseRdsService.describeInstance', () => {
  it('calls DescribeDBInstances and maps the result', async () => {
    const svc = makeService();
    const send = jest
      .fn<() => Promise<{ DBInstances: Array<Record<string, unknown>> }>>()
      .mockResolvedValue({
        DBInstances: [
          {
            DBInstanceIdentifier: 'docita-db',
            DBInstanceStatus: 'available',
            Engine: 'postgres',
            EngineVersion: '15.4',
            AllocatedStorage: 20,
            DBInstanceClass: 'db.t4g.micro',
            MultiAZ: false,
            PubliclyAccessible: false,
            AvailabilityZone: 'ap-south-1a',
            Endpoint: { Address: 'docita-db.x.rds.amazonaws.com', Port: 5432 },
          },
        ],
      });
    svc.setClient({ send } as never);

    const summary = await svc.describeInstance();
    expect(summary.identifier).toBe('docita-db');
    expect(summary.status).toBe('available');
    expect(summary.engine).toBe('postgres');
    expect(summary.allocatedStorageGb).toBe(20);
    expect(summary.endpoint).toBe('docita-db.x.rds.amazonaws.com');
    expect(summary.port).toBe(5432);
    expect(summary.multiAz).toBe(false);
  });

  it('throws when the instance is not found', async () => {
    const svc = makeService();
    const send = jest
      .fn<() => Promise<{ DBInstances: Array<unknown> }>>()
      .mockResolvedValue({ DBInstances: [] });
    svc.setClient({ send } as never);
    await expect(svc.describeInstance()).rejects.toThrow(/not found/);
  });
});

describe('DatabaseRdsService.requestStop', () => {
  it('returns the requestId on success', async () => {
    const svc = makeService();
    const send = jest
      .fn<
        () => Promise<{
          DBInstance: { DBInstanceStatus: string };
          $metadata: { requestId: string };
        }>
      >()
      .mockResolvedValue({
        DBInstance: { DBInstanceStatus: 'stopping' },
        $metadata: { requestId: 'req-123' },
      });
    svc.setClient({ send } as never);
    const result = await svc.requestStop();
    expect(result.requestId).toBe('req-123');
  });

  it('wraps errors with the instance id for easier debugging', async () => {
    const svc = makeService();
    const send = jest
      .fn<() => Promise<never>>()
      .mockRejectedValue(new Error('InvalidDBInstanceState'));
    svc.setClient({ send } as never);
    await expect(svc.requestStop()).rejects.toThrow(
      /docita-db.*InvalidDBInstanceState/,
    );
  });
});
