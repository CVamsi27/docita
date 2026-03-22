Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const core = require('@sentry/core');
const responseEnd = require('./utils/responseEnd.js');

/**
 * Wraps Next.js middleware with Sentry error and performance instrumentation.
 *
 * @param middleware The middleware handler.
 * @returns a wrapped middleware handler.
 */
function wrapMiddlewareWithSentry(
  middleware,
) {
  return new Proxy(middleware, {
    apply: async (wrappingTarget, thisArg, args) => {
      const tunnelRoute =
        '_sentryRewritesTunnelPath' in globalThis
          ? (globalThis )._sentryRewritesTunnelPath
          : undefined;

      if (tunnelRoute && typeof tunnelRoute === 'string') {
        const req = args[0];
        // Check if the current request matches the tunnel route
        if (req instanceof Request) {
          const url = new URL(req.url);
          const isTunnelRequest = url.pathname.startsWith(tunnelRoute);

          if (isTunnelRequest) {
            // Create a simple response that mimics NextResponse.next() so we don't need to import internals here
            // which breaks next 13 apps
            // https://github.com/vercel/next.js/blob/c12c9c1f78ad384270902f0890dc4cd341408105/packages/next/src/server/web/spec-extension/response.ts#L146
            return new Response(null, {
              status: 200,
              headers: {
                'x-middleware-next': '1',
              },
            }) ;
          }
        }
      }
      // TODO: We still should add central isolation scope creation for when our build-time instrumentation does not work anymore with turbopack.
      return core.withIsolationScope(isolationScope => {
        const req = args[0];
        const currentScope = core.getCurrentScope();

        let spanName;
        let spanSource;

        if (req instanceof Request) {
          isolationScope.setSDKProcessingMetadata({
            normalizedRequest: core.winterCGRequestToRequestData(req),
          });
          spanName = `middleware ${req.method}`;
          spanSource = 'url';
        } else {
          spanName = 'middleware';
          spanSource = 'component';
        }

        currentScope.setTransactionName(spanName);

        const activeSpan = core.getActiveSpan();

        if (activeSpan) {
          // If there is an active span, it likely means that the automatic Next.js OTEL instrumentation worked and we can
          // rely on that for parameterization.
          spanName = 'middleware';
          spanSource = 'component';

          const rootSpan = core.getRootSpan(activeSpan);
          if (rootSpan) {
            core.setCapturedScopesOnSpan(rootSpan, currentScope, isolationScope);
          }
        }

        return core.startSpan(
          {
            name: spanName,
            op: 'http.server.middleware',
            attributes: {
              [core.SEMANTIC_ATTRIBUTE_SENTRY_SOURCE]: spanSource,
              [core.SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN]: 'auto.function.nextjs.wrap_middleware',
            },
          },
          () => {
            return core.handleCallbackErrors(
              () => wrappingTarget.apply(thisArg, args),
              error => {
                core.captureException(error, {
                  mechanism: {
                    type: 'auto.function.nextjs.wrap_middleware',
                    handled: false,
                  },
                });
              },
              () => {
                responseEnd.waitUntil(responseEnd.flushSafelyWithTimeout());
              },
            );
          },
        );
      });
    },
  });
}

exports.wrapMiddlewareWithSentry = wrapMiddlewareWithSentry;
//# sourceMappingURL=wrapMiddlewareWithSentry.js.map
