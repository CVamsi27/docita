import { AppLogger } from './logger.service';

describe('AppLogger', () => {
  let logger: AppLogger;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    logger = new AppLogger();
    // Spy on stdout to ensure ConsoleLogger writes there (NestJS ConsoleLogger behavior varies by version, but often uses process.stdout)
    // Actually, ConsoleLogger methods call process.stdout.write or formatting.
    // For simplicity, we can trust ConsoleLogger works and just test our metadata logic if possible,
    // or spy on super methods if we could.
    // Let's spy on process.stdout.write
    consoleSpy = jest
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true);
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('should be defined', () => {
    expect(logger).toBeDefined();
  });

  it('should include metadata in logs', () => {
    logger.setMetadata('requestId', '123');
    logger.log('Test message');

    // Since ConsoleLogger does complex formatting including colors/timestamps,
    // it is hard to assert exact string on stdout.
    // However, we formatted the message PASSED to super.
    // We can inspect the implementation more directly?
    // Or we can rely on integration test.
    // For unit test, we can override the formatMessage method to verify logic? No private.

    const calls = consoleSpy.mock.calls;
    const output = calls.flat().join('');
    // Expect output to contain our message AND metadata
    // ConsoleLogger output might look like: [Nest] ... LOG ... Test message [Meta: {"requestId":"123"}]
    expect(output).toContain('Test message');
    expect(output).toContain('{"requestId":"123"}');
  });
});
