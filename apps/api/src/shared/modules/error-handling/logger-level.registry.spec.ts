import { Logger } from '@nestjs/common';
import {
  createNestLogLevelWriters,
  writeAppLog,
} from './logger-level.registry';

describe('logger-level.registry', () => {
  it('routes known levels to the matching Nest logger method', () => {
    const nestLogger = {
      debug: jest.fn(),
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as unknown as Logger;

    const writers = createNestLogLevelWriters(nestLogger);

    writeAppLog(writers, 'WARN', '{"message":"slow"}');

    expect(nestLogger.warn).toHaveBeenCalledWith('{"message":"slow"}');
    expect(nestLogger.log).not.toHaveBeenCalled();
  });

  it('falls back to INFO for unknown levels', () => {
    const nestLogger = {
      debug: jest.fn(),
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as unknown as Logger;

    const writers = createNestLogLevelWriters(nestLogger);

    writeAppLog(writers, 'TRACE', '{"message":"trace"}');

    expect(nestLogger.log).toHaveBeenCalledWith('{"message":"trace"}');
  });
});
