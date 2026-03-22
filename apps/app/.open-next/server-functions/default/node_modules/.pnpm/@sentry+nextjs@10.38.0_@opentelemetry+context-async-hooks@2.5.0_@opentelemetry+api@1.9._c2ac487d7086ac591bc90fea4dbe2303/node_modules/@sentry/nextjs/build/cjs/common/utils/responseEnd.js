Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const core = require('@sentry/core');
const debugBuild = require('../debug-build.js');

/**
 * Flushes pending Sentry events with a 2 second timeout and in a way that cannot create unhandled promise rejections.
 */
async function flushSafelyWithTimeout() {
  try {
    debugBuild.DEBUG_BUILD && core.debug.log('Flushing events...');
    await core.flush(2000);
    debugBuild.DEBUG_BUILD && core.debug.log('Done flushing events');
  } catch (e) {
    debugBuild.DEBUG_BUILD && core.debug.log('Error while flushing events:\n', e);
  }
}

/**
 * Uses platform-specific waitUntil function to wait for the provided task to complete without blocking.
 */
function waitUntil(task) {
  // If deployed on Cloudflare, use the Cloudflare waitUntil function to flush the events
  if (isCloudflareWaitUntilAvailable()) {
    cloudflareWaitUntil(task);
    return;
  }

  // otherwise, use vercel's
  core.vercelWaitUntil(task);
}

/**
 * Gets the Cloudflare context from the global object.
 * Relevant to opennext
 * https://github.com/opennextjs/opennextjs-cloudflare/blob/b53a046bd5c30e94a42e36b67747cefbf7785f9a/packages/cloudflare/src/cli/templates/init.ts#L17
 */
function _getOpenNextCloudflareContext() {
  const openNextCloudflareContextSymbol = Symbol.for('__cloudflare-context__');

  return (
    core.GLOBAL_OBJ

  )[openNextCloudflareContextSymbol]?.ctx;
}

/**
 * Function that delays closing of a Cloudflare lambda until the provided promise is resolved.
 */
function cloudflareWaitUntil(task) {
  _getOpenNextCloudflareContext()?.waitUntil(task);
}

/**
 * Checks if the Cloudflare waitUntil function is available globally.
 */
function isCloudflareWaitUntilAvailable() {
  return typeof _getOpenNextCloudflareContext()?.waitUntil === 'function';
}

exports.cloudflareWaitUntil = cloudflareWaitUntil;
exports.flushSafelyWithTimeout = flushSafelyWithTimeout;
exports.isCloudflareWaitUntilAvailable = isCloudflareWaitUntilAvailable;
exports.waitUntil = waitUntil;
//# sourceMappingURL=responseEnd.js.map
