import {
  PINO_REDACT_PATHS,
  REDACTED,
  redactErrSerializer,
  redactSerializer,
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
        url: req.url,
      }),
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
