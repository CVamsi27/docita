import { ConsoleLogger, Injectable, Scope } from '@nestjs/common';

@Injectable({ scope: Scope.TRANSIENT })
export class AppLogger extends ConsoleLogger {
  private metadata: Record<string, any> = {};

  setMetadata(key: string, value: any) {
    this.metadata[key] = value;
  }

  log(message: any, context?: string) {
    super.log(this.formatLogMessage(message), context || this.context);
  }

  error(message: any, stack?: string, context?: string) {
    super.error(this.formatLogMessage(message), stack, context || this.context);
  }

  warn(message: any, context?: string) {
    super.warn(this.formatLogMessage(message), context || this.context);
  }

  debug(message: any, context?: string) {
    super.debug(this.formatLogMessage(message), context || this.context);
  }

  verbose(message: any, context?: string) {
    super.verbose(this.formatLogMessage(message), context || this.context);
  }

  private formatLogMessage(message: any): string {
    const metaString = Object.keys(this.metadata).length
      ? ` [Meta: ${JSON.stringify(this.metadata)}]`
      : '';

    if (typeof message === 'object') {
      return `${JSON.stringify(message)}${metaString}`;
    }
    return `${message}${metaString}`;
  }
}
