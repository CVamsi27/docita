import {
  Injectable,
  BadRequestException,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import * as fs from 'fs';

export interface ImportSession {
  filePath: string;
  expiresAt: number;
}

@Injectable()
export class ImportSessionService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ImportSessionService.name);
  private readonly pendingImports = new Map<string, ImportSession>();
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  onModuleInit(): void {
    this.cleanupTimer = setInterval(
      () => {
        this.cleanupExpiredSessions();
      },
      5 * 60 * 1000,
    );
    this.cleanupTimer.unref?.();
  }

  onModuleDestroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  createSession(filePath: string): string {
    const sessionId = Array(16)
      .fill(null)
      .map(() => Math.round(Math.random() * 16).toString(16))
      .join('');

    this.pendingImports.set(sessionId, {
      filePath,
      expiresAt: Date.now() + 30 * 60 * 1000,
    });

    this.cleanupExpiredSessions();
    return sessionId;
  }

  getSession(sessionId: string): ImportSession {
    const session = this.pendingImports.get(sessionId);

    if (!session) {
      throw new BadRequestException(
        'Import session not found or expired. Please upload the file again.',
      );
    }

    if (session.expiresAt < Date.now()) {
      this.pendingImports.delete(sessionId);
      this.deleteFile(session.filePath);
      throw new BadRequestException(
        'Import session expired. Please upload the file again.',
      );
    }

    return session;
  }

  deleteSession(sessionId: string): void {
    const session = this.pendingImports.get(sessionId);
    if (session) {
      this.pendingImports.delete(sessionId);
      this.deleteFile(session.filePath);
    }
  }

  private cleanupExpiredSessions(): void {
    const now = Date.now();
    for (const [sessionId, session] of this.pendingImports.entries()) {
      if (session.expiresAt < now) {
        this.pendingImports.delete(sessionId);
        this.deleteFile(session.filePath);
      }
    }
  }

  private deleteFile(filePath: string): void {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      this.logger.error(`Failed to delete temp file ${filePath}`, error);
    }
  }
}
