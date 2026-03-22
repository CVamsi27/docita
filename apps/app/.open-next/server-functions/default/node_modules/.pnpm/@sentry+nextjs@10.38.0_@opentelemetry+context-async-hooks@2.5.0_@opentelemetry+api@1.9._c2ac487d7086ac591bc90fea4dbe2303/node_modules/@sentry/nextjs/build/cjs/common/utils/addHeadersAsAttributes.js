Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const core = require('@sentry/core');

/**
 * Extracts HTTP request headers as span attributes and optionally applies them to a span.
 */
function addHeadersAsAttributes(
  headers,
  span,
) {
  if (!headers) {
    return {};
  }

  const headersDict =
    headers instanceof Headers || (typeof headers === 'object' && 'get' in headers)
      ? core.winterCGHeadersToDict(headers )
      : headers;

  const headerAttributes = core.httpHeadersToSpanAttributes(headersDict, core.getClient()?.getOptions().sendDefaultPii ?? false);

  if (span) {
    span.setAttributes(headerAttributes);
  }

  return headerAttributes;
}

exports.addHeadersAsAttributes = addHeadersAsAttributes;
//# sourceMappingURL=addHeadersAsAttributes.js.map
