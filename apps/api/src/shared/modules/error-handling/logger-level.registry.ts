import { Logger } from '@nestjs/common';

type AppLogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

const APP_LOG_LEVELS: readonly AppLogLevel[] = [
  'DEBUG',
  'INFO',
  'WARN',
  'ERROR',
];

function parseAppLogLevel(level: string): AppLogLevel | null {
  for (const candidate of APP_LOG_LEVELS) {
    if (candidate === level) {
      return candidate;
    }
  }
  return null;
}

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
  const parsedLevel = parseAppLogLevel(level);
  const writer = parsedLevel ? writers[parsedLevel] : undefined;
  if (writer) {
    writer(serializedEntry);
    return;
  }

  writers.INFO(serializedEntry);
}
