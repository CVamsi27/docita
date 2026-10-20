import { redactMonitoringUrl } from '@workspace/utils';
import {
  PINO_REDACT_PATHS,
  REDACTED,
  redactErrSerializer,
  redactSerializer,
  redactString,
} from './phi-redactor';

export function buildPinoOptions(opts: {
  isProduction: boolean;
  isTest?: boolean;
}) {
  return {
    level: opts.isProduction ? 'info' : 'debug',
    transport:
      !opts.isProduction && !opts.isTest
        ? { target: 'pino-pretty' }
        : undefined,
    autoLogging: false,
    redact: {
      paths: PINO_REDACT_PATHS.slice(),
      censor: REDACTED,
    },
    serializers: {
      req: (req: Record<string, unknown>) => ({
        id: req.id,
        method: req.method,
        url:
          typeof req.url === 'string'
            ? redactMonitoringUrl(req.url)
            : undefined,
      }),
      msg: (message: unknown) =>
        typeof message === 'string'
          ? redactString(message)
          : redactSerializer(message),
      path: (path: unknown) =>
        typeof path === 'string' ? redactMonitoringUrl(path) : undefined,
      url: (url: unknown) =>
        typeof url === 'string' ? redactMonitoringUrl(url) : undefined,
      route: (route: unknown) =>
        typeof route === 'string' ? redactMonitoringUrl(route) : undefined,
      body: redactSerializer,
      payload: redactSerializer,
      data: redactSerializer,
      patient: redactSerializer,
      consultation: redactSerializer,
      appointment: redactSerializer,
      err: redactErrSerializer,
      error: redactErrSerializer,
    },
  } as const;
}
