Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const core = require('@sentry/core');
const debugBuild = require('../common/debug-build.js');

// Inline AsyncLocalStorage interface from current types
// Avoids conflict with resolving it from getBuiltinModule

/**
 * Prepares the global object to generate safe random IDs in cache components contexts
 * See: https://github.com/getsentry/sentry-javascript/blob/ceb003c15973c2d8f437dfb7025eedffbc8bc8b0/packages/core/src/utils/propagationContext.ts#L1
 */
function prepareSafeIdGeneratorContext() {
  const sym = Symbol.for('__SENTRY_SAFE_RANDOM_ID_WRAPPER__');
  const globalWithSymbol = core.GLOBAL_OBJ;

  // Get initial snapshot - if unavailable, don't set up the wrapper at all
  const initialSnapshot = getAsyncLocalStorageSnapshot();
  if (!initialSnapshot) {
    return;
  }

  // We store a wrapper function instead of the raw snapshot because in serverless
  // environments (e.g., Cloudflare Workers), the snapshot is bound to the request
  // context it was created in. Once that request ends, the snapshot becomes invalid.
  // The wrapper catches this and creates a fresh snapshot for the current request context.
  let cachedSnapshot = initialSnapshot;

  globalWithSymbol[sym] = (callback) => {
    try {
      return cachedSnapshot(callback);
    } catch (error) {
      // Only handle AsyncLocalStorage-related errors, rethrow others
      if (!isAsyncLocalStorageError(error)) {
        throw error;
      }

      // Snapshot likely stale, try to get a fresh one and retry
      const freshSnapshot = getAsyncLocalStorageSnapshot();
      // No snapshot available, fall back to direct execution
      if (!freshSnapshot) {
        return callback();
      }

      // Update the cached snapshot
      cachedSnapshot = freshSnapshot;

      // Retry the callback with the fresh snapshot
      try {
        return cachedSnapshot(callback);
      } catch (retryError) {
        // Only fall back for AsyncLocalStorage errors, rethrow others
        if (!isAsyncLocalStorageError(retryError)) {
          throw retryError;
        }
        // If fresh snapshot also fails with ALS error, fall back to direct execution
        return callback();
      }
    }
  };

  debugBuild.DEBUG_BUILD && core.debug.log('[@sentry/nextjs] Prepared safe random ID generator context');
}

function getAsyncLocalStorage() {
  // May exist in the Next.js runtime globals
  // Doesn't exist in some of our tests
  if (typeof AsyncLocalStorage !== 'undefined') {
    return AsyncLocalStorage;
  }

  // Try to resolve it dynamically without synchronously importing the module
  // This is done to avoid importing the module synchronously at the top
  // which means this is safe across runtimes
  if ('getBuiltinModule' in process && typeof process.getBuiltinModule === 'function') {
    const { AsyncLocalStorage } = process.getBuiltinModule('async_hooks') ?? {};

    return AsyncLocalStorage ;
  }

  return undefined;
}

function getAsyncLocalStorageSnapshot() {
  const als = getAsyncLocalStorage();

  if (!als || typeof als.snapshot !== 'function') {
    debugBuild.DEBUG_BUILD &&
      core.debug.warn(
        '[@sentry/nextjs] No AsyncLocalStorage found in the runtime or AsyncLocalStorage.snapshot() is not available, skipping safe random ID generator context preparation, you may see some errors with cache components.',
      );
    return undefined;
  }

  return als.snapshot();
}

function isAsyncLocalStorageError(error) {
  return error instanceof Error && error.message.includes('AsyncLocalStorage');
}

exports.prepareSafeIdGeneratorContext = prepareSafeIdGeneratorContext;
//# sourceMappingURL=prepareSafeIdGeneratorContext.js.map
