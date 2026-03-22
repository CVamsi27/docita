Object.defineProperties(exports, { __esModule: { value: true }, [Symbol.toStringTag]: { value: 'Module' } });

/* eslint-disable @sentry-internal/sdk/no-unsafe-random-apis */
// Polyfill for Node.js perf_hooks module in edge runtime
// This mirrors the polyfill from packages/vercel-edge/rollup.npm.config.mjs
const __sentry__timeOrigin = Date.now();

// Ensure performance global is available
if (typeof globalThis !== 'undefined' && globalThis.performance === undefined) {
  globalThis.performance = {
    timeOrigin: __sentry__timeOrigin,
    now: function () {
      return Date.now() - __sentry__timeOrigin;
    },
  };
}

// Export the performance object for perf_hooks compatibility
const performance = globalThis.performance || {
  timeOrigin: __sentry__timeOrigin,
  now: function () {
    return Date.now() - __sentry__timeOrigin;
  },
};

// Default export for CommonJS compatibility
const perf_hooks = {
  performance,
};

exports.default = perf_hooks;
exports.performance = performance;
//# sourceMappingURL=perf_hooks.js.map
