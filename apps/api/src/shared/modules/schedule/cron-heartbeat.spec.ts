import {
  registerCronHeartbeatService,
  TrackHeartbeat,
  type ICronHeartbeatService,
} from './cron-heartbeat';

describe('TrackHeartbeat', () => {
  const recordSuccess = jest.fn<
    ReturnType<ICronHeartbeatService['recordSuccess']>,
    Parameters<ICronHeartbeatService['recordSuccess']>
  >();
  const recordFailure = jest.fn<
    ReturnType<ICronHeartbeatService['recordFailure']>,
    Parameters<ICronHeartbeatService['recordFailure']>
  >();
  let unregister: () => void;

  class TestScheduler {
    @TrackHeartbeat('test.success')
    async succeed(): Promise<string> {
      return 'ok';
    }

    @TrackHeartbeat('test.failure')
    async fail(): Promise<void> {
      throw new Error('scheduled failure');
    }
  }

  beforeEach(() => {
    jest.clearAllMocks();
    recordSuccess.mockResolvedValue(undefined);
    recordFailure.mockResolvedValue(undefined);
    unregister = registerCronHeartbeatService({
      recordSuccess,
      recordFailure,
    });
  });

  afterEach(() => {
    unregister();
  });

  it('records successful scheduler runs', async () => {
    await expect(new TestScheduler().succeed()).resolves.toBe('ok');
    expect(recordSuccess).toHaveBeenCalledWith('test.success');
    expect(recordFailure).not.toHaveBeenCalled();
  });

  it('records failed scheduler runs and preserves the error', async () => {
    await expect(new TestScheduler().fail()).rejects.toThrow(
      'scheduled failure',
    );
    expect(recordFailure).toHaveBeenCalledWith(
      'test.failure',
      expect.any(Error),
    );
  });
});
