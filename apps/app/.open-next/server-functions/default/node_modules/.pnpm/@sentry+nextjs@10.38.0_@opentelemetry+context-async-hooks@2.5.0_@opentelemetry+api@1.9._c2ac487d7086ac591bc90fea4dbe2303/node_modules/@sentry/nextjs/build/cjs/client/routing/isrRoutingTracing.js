Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const core = require('@sentry/core');
const react = require('@sentry/react');
const parameterization = require('./parameterization.js');

/**
 * Cache for ISR/SSG route checks. Exported for testing purposes.
 * @internal
 */
const IS_ISR_SSG_ROUTE_CACHE = new core.LRUMap(100);

/**
 * Check if the current page is an ISR/SSG route by checking the route manifest.
 * @internal Exported for testing purposes.
 */
function isIsrSsgRoute(pathname) {
  // Early parameterization to get the cache key
  const parameterizedPath = parameterization.maybeParameterizeRoute(pathname);
  const pathToCheck = parameterizedPath || pathname;

  // Check cache using the parameterized path as the key
  const cachedResult = IS_ISR_SSG_ROUTE_CACHE.get(pathToCheck);
  if (cachedResult !== undefined) {
    return cachedResult;
  }

  // Cache miss get the manifest
  const manifest = parameterization.getManifest();
  if (!manifest?.isrRoutes || !Array.isArray(manifest.isrRoutes) || manifest.isrRoutes.length === 0) {
    IS_ISR_SSG_ROUTE_CACHE.set(pathToCheck, false);
    return false;
  }

  const isIsrSsgRoute = manifest.isrRoutes.includes(pathToCheck);
  IS_ISR_SSG_ROUTE_CACHE.set(pathToCheck, isIsrSsgRoute);

  return isIsrSsgRoute;
}

/**
 * Remove sentry-trace and baggage meta tags from the DOM if this is an ISR/SSG page.
 * This prevents the browser tracing integration from using stale/cached trace IDs.
 */
function removeIsrSsgTraceMetaTags() {
  if (!react.WINDOW.document || !isIsrSsgRoute(react.WINDOW.location.pathname)) {
    return;
  }

  // Helper function to remove a meta tag
  function removeMetaTag(metaName) {
    try {
      const meta = react.WINDOW.document.querySelector(`meta[name="${metaName}"]`);
      if (meta) {
        meta.remove();
      }
    } catch {
      // ignore errors when removing the meta tag
    }
  }

  // Remove the meta tags so browserTracingIntegration won't pick them up
  removeMetaTag('sentry-trace');
  removeMetaTag('baggage');
}

exports.IS_ISR_SSG_ROUTE_CACHE = IS_ISR_SSG_ROUTE_CACHE;
exports.isIsrSsgRoute = isIsrSsgRoute;
exports.removeIsrSsgTraceMetaTags = removeIsrSsgTraceMetaTags;
//# sourceMappingURL=isrRoutingTracing.js.map
