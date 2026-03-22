Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const core = require('@sentry/core');
const nextNavigationErrorUtils = require('./nextNavigationErrorUtils.js');
const responseEnd = require('./utils/responseEnd.js');

/**
 * Wraps an `app` directory server component with Sentry error instrumentation.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function wrapServerComponentWithSentry(
  appDirComponent,
  context,
) {
  // Even though users may define server components as async functions, for the client bundles
  // Next.js will turn them into synchronous functions and it will transform any `await`s into instances of the `use`
  // hook. 🤯
  return new Proxy(appDirComponent, {
    apply: (originalFunction, thisArg, args) => {
      const isolationScope = core.getIsolationScope();

      const headersDict = context.headers ? core.winterCGHeadersToDict(context.headers) : undefined;

      isolationScope.setSDKProcessingMetadata({
        normalizedRequest: {
          headers: headersDict,
        } ,
      });

      return core.handleCallbackErrors(
        () => originalFunction.apply(thisArg, args),
        error => {
          const span = core.getActiveSpan();
          const { componentRoute, componentType } = context;
          let shouldCapture = true;
          isolationScope.setTransactionName(`${componentType} Server Component (${componentRoute})`);

          if (span) {
            if (nextNavigationErrorUtils.isNotFoundNavigationError(error)) {
              // We don't want to report "not-found"s
              shouldCapture = false;
              span.setStatus({ code: core.SPAN_STATUS_ERROR, message: 'not_found' });
            } else if (nextNavigationErrorUtils.isRedirectNavigationError(error)) {
              // We don't want to report redirects
              shouldCapture = false;
              span.setStatus({ code: core.SPAN_STATUS_OK });
            } else {
              span.setStatus({ code: core.SPAN_STATUS_ERROR, message: 'internal_error' });
            }
          }

          if (shouldCapture) {
            core.captureException(error, {
              mechanism: {
                handled: false,
                type: 'auto.function.nextjs.server_component',
              },
            });
          }
        },
        () => {
          responseEnd.waitUntil(responseEnd.flushSafelyWithTimeout());
        },
      );
    },
  });
}

exports.wrapServerComponentWithSentry = wrapServerComponentWithSentry;
//# sourceMappingURL=wrapServerComponentWithSentry.js.map
