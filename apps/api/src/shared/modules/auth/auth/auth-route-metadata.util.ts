import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from './public.decorator';
import { IS_UPLOAD_SESSION_SECRET_ROUTE_KEY } from './upload-session-secret-route.decorator';

/**
 * Routes that skip JWT and role checks at the edge: fully public handlers, or
 * handlers that use upload-session capability tokens validated by
 * `UploadSessionSecretGuard`.
 */
export function bypassesSessionGuards(
  reflector: Reflector,
  context: ExecutionContext,
): boolean {
  const targets = [context.getHandler(), context.getClass()];
  if (reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets)) {
    return true;
  }
  return Boolean(
    reflector.getAllAndOverride<boolean>(
      IS_UPLOAD_SESSION_SECRET_ROUTE_KEY,
      targets,
    ),
  );
}
