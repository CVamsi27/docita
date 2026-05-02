import {
  PINO_REDACT_PATHS,
  REDACTED,
  redactErrSerializer,
  redactSerializer,
} from './phi-redactor';

/**
 * Construct the pino options bag the API uses. Extracted from the LoggerModule
 * factory so the same configuration can be exercised by unit tests
 * (apps/api/test/phi-leak-guard.spec.ts) without bringing up the full Nest app.
 */
export function buildPinoOptions(opts: { isProduction: boolean }) {
  return {
    level: opts.isProduction ? 'info' : 'debug',
    transport: !opts.isProduction ? { target: 'pino-pretty' } : undefined,
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
