Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const core = require('@sentry/core');
const responseEnd = require('./utils/responseEnd.js');

/**
 * Reports errors passed to the the Next.js `onRequestError` instrumentation hook.
 */
function captureRequestError(error, request, errorContext) {
  core.withScope(scope => {
    scope.setSDKProcessingMetadata({
      normalizedRequest: {
        headers: core.headersToDict(request.headers),
        method: request.method,
      } ,
    });

    scope.setContext('nextjs', {
      request_path: request.path,
      router_kind: errorContext.routerKind,
      router_path: errorContext.routePath,
      route_type: errorContext.routeType,
    });

    scope.setTransactionName(errorContext.routePath);

    core.captureException(error, {
      mechanism: {
        handled: false,
        type: 'auto.function.nextjs.on_request_error',
      },
    });

    responseEnd.waitUntil(responseEnd.flushSafelyWithTimeout());
  });
}

exports.captureRequestError = captureRequestError;
//# sourceMappingURL=captureRequestError.js.map
