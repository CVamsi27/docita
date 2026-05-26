import { Controller } from '@nestjs/common';

/**
 * AppController previously exposed a stub `GET /health` that returned
 * `{ status: 'ok' }` without checking anything — making the API report
 * healthy even when the DB was unreachable. The proper liveness/readiness
 * surface lives at `shared/common/controllers/health-check.controller.ts`
 * (HealthCheckController) which runs a real `SELECT 1` against Postgres.
 *
 * Kept as a placeholder so the module wiring doesn't change; remove the
 * controller entirely once we confirm nothing references it from outside.
 */
@Controller()
export class AppController {}
