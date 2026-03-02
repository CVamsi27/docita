import { AppLogger } from './logger.service';

describe('AppLogger', () => {
  let logger: AppLogger;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    logger = new AppLogger();

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

    const calls = consoleSpy.mock.calls;
    const output = calls.flat().join('');

    expect(output).toContain('Test message');
    expect(output).toContain('{"requestId":"123"}');
  });
});
