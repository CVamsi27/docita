import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService } from '@/shared/modules/audit/audit/audit.service';
import {
  isWriteHttpMethod,
  readAuditActor,
  toAuditRecord,
} from '@/shared/common/utils/audit-request.util';
import { Request } from 'express';

interface ClassifiedAuditEvent {
  actionType: string;
  resourceType: string;
  resourceId: string;
  immediate: boolean;
}

const REDACTED_KEYS = new Set([
  'password',
  'currentPassword',
  'newPassword',
  'token',
  'refresh_token',
  'access_token',
  'mfa_challenge_token',
  'code',
  'secret',
  'signature',
]);
const RESOURCE_ID_KEYS = [
  'patientId',
  'appointmentId',
  'prescriptionId',
  'invoiceId',
  'documentId',
  'subscriptionId',
  'paymentId',
  'userId',
  'id',
  'clinicId',
];

function valueFromRecord(
  record: Record<string, unknown> | undefined,
  key: string,
): string | undefined {
  const candidate = record?.[key];
  if (typeof candidate === 'string' && candidate.trim().length > 0) {
    return candidate.trim();
  }
  return undefined;
}

function extractResourceId(args: {
  params?: Record<string, unknown>;
  query?: Record<string, unknown>;
  body?: Record<string, unknown>;
}): string {
  for (const key of RESOURCE_ID_KEYS) {
    const fromParams = valueFromRecord(args.params, key);
    if (fromParams) return fromParams;

    const fromQuery = valueFromRecord(args.query, key);
    if (fromQuery) return fromQuery;

    const fromBody = valueFromRecord(args.body, key);
    if (fromBody) return fromBody;
  }

  return 'unknown';
}

export function sanitizeAuditPayload(
  value: unknown,
  visited: WeakSet<object> = new WeakSet(),
): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value !== 'object') return value;

  if (visited.has(value)) {
    return '[Circular]';
  }
  visited.add(value);

  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeAuditPayload(entry, visited));
  }

  const record = value;
  const sanitized: Record<string, unknown> = {};

  for (const [key, entry] of Object.entries(record)) {
    if (REDACTED_KEYS.has(key)) {
      sanitized[key] = '[REDACTED]';
      continue;
    }
    sanitized[key] = sanitizeAuditPayload(entry, visited);
  }

  return sanitized;
}

export function classifySensitiveWrite(args: {
  method: string;
  url: string;
  params?: Record<string, unknown>;
  query?: Record<string, unknown>;
  body?: Record<string, unknown>;
}): ClassifiedAuditEvent | null {
  const method = args.method.toUpperCase();
  if (!isWriteHttpMethod(method)) {
    return null;
  }

  const path = args.url.split('?')[0].toLowerCase();
  const resourceId = extractResourceId(args);

  if (path.startsWith('/auth/api-keys')) {
    return {
      actionType: `API_KEY_${method}`,
      resourceType: 'API_KEY',
      resourceId,
      immediate: true,
    };
  }
  if (path.startsWith('/auth/sessions')) {
    return {
      actionType: `SESSION_${method}`,
      resourceType: 'SESSION',
      resourceId,
      immediate: true,
    };
  }
  if (
    path.startsWith('/auth/mfa') ||
    path.startsWith('/auth/change-password')
  ) {
    return {
      actionType: `AUTH_${method}`,
      resourceType: 'AUTH_ACCOUNT',
      resourceId,
      immediate: true,
    };
  }
  if (path.startsWith('/users') || path.startsWith('/clinics')) {
    return {
      actionType: `ACCESS_CONTROL_${method}`,
      resourceType: path.startsWith('/users') ? 'USER' : 'CLINIC',
      resourceId,
      immediate: true,
    };
  }

  if (
    path.startsWith('/subscription') ||
    path.startsWith('/subscriptions') ||
    path.startsWith('/billing') ||
    path.startsWith('/payments') ||
    path.startsWith('/invoices')
  ) {
    return {
      actionType: `BILLING_${method}`,
      resourceType: 'BILLING',
      resourceId,
      immediate: false,
    };
  }

  if (
    path.startsWith('/patients') ||
    path.startsWith('/appointments') ||
    path.startsWith('/prescriptions') ||
    path.startsWith('/documents') ||
    path.startsWith('/medical-documents') ||
    path.startsWith('/lab-tests') ||
    path.startsWith('/clinical') ||
    path.startsWith('/inventory') ||
    path.startsWith('/queue') ||
    path.startsWith('/follow-ups') ||
    path.startsWith('/vitals') ||
    path.startsWith('/patient-portal')
  ) {
    return {
      actionType: `CLINICAL_${method}`,
      resourceType: 'CLINICAL_DATA',
      resourceId,
      immediate: false,
    };
  }

  return null;
}

@Injectable()
export class PatientDataAuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(PatientDataAuditInterceptor.name);

  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const { user, method, url, params, query, body } = request;

    if (!user) {
      return next.handle();
    }

    return next.handle().pipe(
      tap({
        next: () => {
          (async () => {
            try {
              const actor = readAuditActor(user);

              if (!actor.userId || !actor.clinicId) {
                return;
              }

              const classification = classifySensitiveWrite({
                method,
                url,
                params: toAuditRecord(params),
                query: toAuditRecord(query),
                body: toAuditRecord(body),
              });

              if (!classification) {
                return;
              }

              const changes =
                method === 'DELETE'
                  ? { before: null, after: null }
                  : {
                      before: null,
                      after: sanitizeAuditPayload(body ?? {}),
                    };

              await this.auditService.logAction(
                {
                  userId: actor.userId,
                  clinicId: actor.clinicId,
                  actionType: classification.actionType,
                  resourceType: classification.resourceType,
                  resourceId: classification.resourceId,
                  changes,
                  ipAddress: request.ip || request.socket?.remoteAddress,
                  userAgent: request.headers['user-agent'],
                  metadata: {
                    actor: {
                      id: actor.userId,
                      role: actor.role ?? null,
                      clinicId: actor.clinicId,
                    },
                    request: {
                      method,
                      endpoint: url,
                      params: sanitizeAuditPayload(params),
                      query: sanitizeAuditPayload(query),
                    },
                    source: 'sensitive-write-audit-v1',
                  },
                },
                classification.immediate,
              );
            } catch (error) {
              this.logger.error('Failed to log patient audit event', error);
            }
          })();
        },
      }),
    );
  }
}
