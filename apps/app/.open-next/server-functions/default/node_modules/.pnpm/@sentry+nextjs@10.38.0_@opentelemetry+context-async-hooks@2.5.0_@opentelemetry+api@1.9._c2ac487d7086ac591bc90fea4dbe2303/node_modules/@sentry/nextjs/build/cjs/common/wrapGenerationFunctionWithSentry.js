Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const core = require('@sentry/core');
const nextNavigationErrorUtils = require('./nextNavigationErrorUtils.js');
const responseEnd = require('./utils/responseEnd.js');

/**
 * Wraps a generation function (e.g. generateMetadata) with Sentry error instrumentation.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function wrapGenerationFunctionWithSentry(
  generationFunction,
  context,
) {
  return new Proxy(generationFunction, {
    apply: (originalFunction, thisArg, args) => {
      const isolationScope = core.getIsolationScope();

      let headers = undefined;
      // We try-catch here just in case anything goes wrong with the async storage since it is Next.js internal API
      try {
        headers = context.requestAsyncStorage?.getStore()?.headers;
      } catch {
        /** empty */
      }

      const headersDict = headers ? core.winterCGHeadersToDict(headers) : undefined;

      isolationScope.setSDKProcessingMetadata({
        normalizedRequest: {
          headers: headersDict,
        } ,
      });

      return core.handleCallbackErrors(
        () => originalFunction.apply(thisArg, args),
        error => {
          const span = core.getActiveSpan();
          const { componentRoute, componentType, generationFunctionIdentifier } = context;
          let shouldCapture = true;
          isolationScope.setTransactionName(`${componentType}.${generationFunctionIdentifier} (${componentRoute})`);

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
                type: 'auto.function.nextjs.generation_function',
                data: {
                  function: generationFunctionIdentifier,
                },
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

exports.wrapGenerationFunctionWithSentry = wrapGenerationFunctionWithSentry;
//# sourceMappingURL=wrapGenerationFunctionWithSentry.js.map
