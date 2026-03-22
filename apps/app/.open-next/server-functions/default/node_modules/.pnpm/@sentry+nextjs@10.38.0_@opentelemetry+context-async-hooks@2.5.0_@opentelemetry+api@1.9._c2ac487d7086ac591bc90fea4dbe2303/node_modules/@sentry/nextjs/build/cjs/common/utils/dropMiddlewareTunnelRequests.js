Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const semanticConventions = require('@opentelemetry/semantic-conventions');
const core = require('@sentry/core');
const opentelemetry = require('@sentry/opentelemetry');
const nextSpanAttributes = require('../nextSpanAttributes.js');
const spanAttributesWithLogicAttached = require('../span-attributes-with-logic-attached.js');

const globalWithInjectedValues = core.GLOBAL_OBJ

;

/**
 * Drops spans for tunnel requests from middleware or fetch instrumentation.
 * This catches both:
 * 1. Requests to the local tunnel route (before rewrite)
 * 2. Requests to Sentry ingest (after rewrite)
 */
function dropMiddlewareTunnelRequests(span, attrs) {
  // Only filter middleware spans or HTTP fetch spans
  const isMiddleware = attrs?.[nextSpanAttributes.ATTR_NEXT_SPAN_TYPE] === 'Middleware.execute';
  // The fetch span could be originating from rewrites re-writing a tunnel request
  // So we want to filter it out
  const isFetchSpan = attrs?.[core.SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN] === 'auto.http.otel.node_fetch';

  // If the span is not a middleware span or a fetch span, return
  if (!isMiddleware && !isFetchSpan) {
    return;
  }

  // Check if this is either a tunnel route request or a Sentry ingest request
  const isTunnel = isTunnelRouteSpan(attrs || {});
  const isSentry = opentelemetry.isSentryRequestSpan(span);

  if (isTunnel || isSentry) {
    // Mark the span to be dropped
    span.setAttribute(spanAttributesWithLogicAttached.TRANSACTION_ATTR_SHOULD_DROP_TRANSACTION, true);
  }
}

/**
 * Checks if a span's HTTP target matches the tunnel route.
 */
function isTunnelRouteSpan(spanAttributes) {
  const tunnelPath = globalWithInjectedValues._sentryRewritesTunnelPath || process.env._sentryRewritesTunnelPath;
  if (!tunnelPath) {
    return false;
  }

  // eslint-disable-next-line deprecation/deprecation
  const httpTarget = spanAttributes[semanticConventions.SEMATTRS_HTTP_TARGET];

  if (typeof httpTarget === 'string') {
    // Extract pathname from the target (e.g., "/tunnel?o=123&p=456" -> "/tunnel")
    const pathname = httpTarget.split('?')[0] || '';

    return pathname.startsWith(tunnelPath);
  }

  return false;
}

exports.dropMiddlewareTunnelRequests = dropMiddlewareTunnelRequests;
//# sourceMappingURL=dropMiddlewareTunnelRequests.js.map
