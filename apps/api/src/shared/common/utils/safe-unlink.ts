import { unlink } from 'fs/promises';
import { Logger } from '@nestjs/common';

export async function safeUnlink(
  filePath: string,
  logger?: Logger,
  context?: string,
): Promise<void> {
  try {
    await unlink(filePath);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    const prefix = context ? `[${context}] ` : '';
    if (logger) {
      logger.warn(
        `${prefix}Failed to clean up temp file ${filePath}: ${message}`,
      );
    }
  }
}
