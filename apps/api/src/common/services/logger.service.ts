import { ConsoleLogger, Injectable, Scope } from '@nestjs/common';

@Injectable({ scope: Scope.TRANSIENT })
export class AppLogger extends ConsoleLogger {
  private metadata: Record<string, unknown> = {};

  setMetadata(key: string, value: unknown) {
    this.metadata[key] = value;
  }

  log(message: string | Record<string, unknown>, context?: string) {
    super.log(this.formatLogMessage(message), context || this.context);
  }

  error(
    message: string | Record<string, unknown>,
    stack?: string,
    context?: string,
  ) {
    super.error(this.formatLogMessage(message), stack, context || this.context);
  }

  warn(message: string | Record<string, unknown>, context?: string) {
    super.warn(this.formatLogMessage(message), context || this.context);
  }

  debug(message: string | Record<string, unknown>, context?: string) {
    super.debug(this.formatLogMessage(message), context || this.context);
  }

  verbose(message: string | Record<string, unknown>, context?: string) {
    super.verbose(this.formatLogMessage(message), context || this.context);
  }

  private formatLogMessage(message: string | Record<string, unknown>): string {
    const metaString = Object.keys(this.metadata).length
      ? ` [Meta: ${JSON.stringify(this.metadata)}]`
      : '';

    if (typeof message === 'object') {
      return `${JSON.stringify(message)}${metaString}`;
    }
    return `${message}${metaString}`;
  }
}
