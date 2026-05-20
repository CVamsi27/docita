import { Logger } from '@nestjs/common';

type AppLogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export function createNestLogLevelWriters(
  logger: Logger,
): Record<AppLogLevel, (message: string) => void> {
  return {
    DEBUG: (message) => logger.debug(message),
    INFO: (message) => logger.log(message),
    WARN: (message) => logger.warn(message),
    ERROR: (message) => logger.error(message),
  };
}

export function writeAppLog(
  writers: Record<AppLogLevel, (message: string) => void>,
  level: string,
  serializedEntry: string,
): void {
  const writer = writers[level as AppLogLevel];
  if (writer) {
    writer(serializedEntry);
    return;
  }

  writers.INFO(serializedEntry);
}
