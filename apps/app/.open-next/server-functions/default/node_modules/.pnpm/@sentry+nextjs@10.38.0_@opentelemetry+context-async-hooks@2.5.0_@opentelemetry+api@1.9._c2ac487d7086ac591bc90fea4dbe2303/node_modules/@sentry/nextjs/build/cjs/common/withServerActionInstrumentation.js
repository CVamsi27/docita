Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const core = require('@sentry/core');
const responseEnd = require('./utils/responseEnd.js');
const debugBuild = require('./debug-build.js');
const nextNavigationErrorUtils = require('./nextNavigationErrorUtils.js');

/**
 * Wraps a Next.js Server Action implementation with Sentry Error and Performance instrumentation.
 */
function withServerActionInstrumentation(
  ...args
) {
  if (typeof args[1] === 'function') {
    const [serverActionName, callback] = args;
    return withServerActionInstrumentationImplementation(serverActionName, {}, callback);
  } else {
    const [serverActionName, options, callback] = args;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return withServerActionInstrumentationImplementation(serverActionName, options, callback);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function withServerActionInstrumentationImplementation(
  serverActionName,
  options,
  callback,
) {
  return core.withIsolationScope(async isolationScope => {
    const sendDefaultPii = core.getClient()?.getOptions().sendDefaultPii;

    let sentryTraceHeader;
    let baggageHeader;
    const fullHeadersObject = {};
    try {
      const awaitedHeaders = await options.headers;
      sentryTraceHeader = awaitedHeaders?.get('sentry-trace') ?? undefined;
      baggageHeader = awaitedHeaders?.get('baggage');
      awaitedHeaders?.forEach((value, key) => {
        fullHeadersObject[key] = value;
      });
    } catch {
      debugBuild.DEBUG_BUILD &&
        core.debug.warn(
          "Sentry wasn't able to extract the tracing headers for a server action. Will not trace this request.",
        );
    }

    isolationScope.setTransactionName(`serverAction/${serverActionName}`);
    isolationScope.setSDKProcessingMetadata({
      normalizedRequest: {
        headers: fullHeadersObject,
      } ,
    });

    // Normally, there is an active span here (from Next.js OTEL) and we just use that as parent
    // Else, we manually continueTrace from the incoming headers
    const continueTraceIfNoActiveSpan = core.getActiveSpan()
      ? (_opts, callback) => callback()
      : core.continueTrace;

    return continueTraceIfNoActiveSpan(
      {
        sentryTrace: sentryTraceHeader,
        baggage: baggageHeader,
      },
      async () => {
        try {
          return await core.startSpan(
            {
              op: 'function.server_action',
              name: `serverAction/${serverActionName}`,
              forceTransaction: true,
              attributes: {
                [core.SEMANTIC_ATTRIBUTE_SENTRY_SOURCE]: 'route',
                [core.SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN]: 'auto.function.nextjs.server_action',
              },
            },
            async span => {
              const result = await core.handleCallbackErrors(callback, error => {
                if (nextNavigationErrorUtils.isNotFoundNavigationError(error)) {
                  // We don't want to report "not-found"s
                  span.setStatus({ code: core.SPAN_STATUS_ERROR, message: 'not_found' });
                } else if (nextNavigationErrorUtils.isRedirectNavigationError(error)) {
                  // Don't do anything for redirects
                } else {
                  span.setStatus({ code: core.SPAN_STATUS_ERROR, message: 'internal_error' });
                  core.captureException(error, {
                    mechanism: {
                      handled: false,
                      type: 'auto.function.nextjs.server_action',
                    },
                  });
                }
              });

              if (options.recordResponse !== undefined ? options.recordResponse : sendDefaultPii) {
                core.getIsolationScope().setExtra('server_action_result', result);
              }

              if (options.formData) {
                options.formData.forEach((value, key) => {
                  core.getIsolationScope().setExtra(
                    `server_action_form_data.${key}`,
                    typeof value === 'string' ? value : '[non-string value]',
                  );
                });
              }

              return result;
            },
          );
        } finally {
          responseEnd.waitUntil(responseEnd.flushSafelyWithTimeout());
        }
      },
    );
  });
}

exports.withServerActionInstrumentation = withServerActionInstrumentation;
//# sourceMappingURL=withServerActionInstrumentation.js.map
