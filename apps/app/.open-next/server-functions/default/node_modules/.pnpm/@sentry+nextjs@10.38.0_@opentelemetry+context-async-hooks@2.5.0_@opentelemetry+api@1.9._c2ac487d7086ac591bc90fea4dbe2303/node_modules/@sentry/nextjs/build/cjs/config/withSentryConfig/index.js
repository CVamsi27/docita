Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const core = require('@sentry/core');
const getFinalConfigObject = require('./getFinalConfigObject.js');

/**
 * Wraps a user's Next.js config and applies Sentry build-time behavior (instrumentation + sourcemap upload).
 *
 * Supports both object and function Next.js configs.
 *
 * @param nextConfig - The user's exported Next.js config
 * @param sentryBuildOptions - Options to configure Sentry's build-time behavior
 * @returns The wrapped Next.js config (same shape as the input)
 */
function withSentryConfig(nextConfig, sentryBuildOptions = {}) {
  const castNextConfig = (nextConfig ) || {};
  if (typeof castNextConfig === 'function') {
    return function ( ...webpackConfigFunctionArgs) {
      const maybePromiseNextConfig = castNextConfig.apply(
        this,
        webpackConfigFunctionArgs,
      );

      if (core.isThenable(maybePromiseNextConfig)) {
        return maybePromiseNextConfig.then(promiseResultNextConfig => {
          return getFinalConfigObject.getFinalConfigObject(promiseResultNextConfig, sentryBuildOptions);
        });
      }

      return getFinalConfigObject.getFinalConfigObject(maybePromiseNextConfig, sentryBuildOptions);
    } ;
  } else {
    return getFinalConfigObject.getFinalConfigObject(castNextConfig, sentryBuildOptions) ;
  }
}

exports.withSentryConfig = withSentryConfig;
//# sourceMappingURL=index.js.map
