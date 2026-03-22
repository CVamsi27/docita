Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const core = require('@sentry/core');

const HeaderKeys = {
  FORWARDED_PROTO: 'x-forwarded-proto',
  FORWARDED_HOST: 'x-forwarded-host',
  HOST: 'host',
  REFERER: 'referer',
} ;

/**
 * Replaces route parameters in a path template with their values
 * @param path - The path template containing parameters in [paramName] format
 * @param params - Optional route parameters to replace in the template
 * @returns The path with parameters replaced
 */
function substituteRouteParams(path, params) {
  return path;
}

/**
 * Normalizes a path by removing route groups
 * @param path - The path to normalize
 * @returns The normalized path
 */
function sanitizeRoutePath(path) {
  const cleanedSegments = path
    .split('/')
    .filter(segment => segment && !(segment.startsWith('(') && segment.endsWith(')')));

  return cleanedSegments.length > 0 ? `/${cleanedSegments.join('/')}` : '/';
}

/**
 * Constructs a full URL from the component route, parameters, and headers.
 *
 * @param componentRoute - The route template to construct the URL from
 * @param params - Optional route parameters to replace in the template
 * @param headersDict - Optional headers containing protocol and host information
 * @param pathname - Optional pathname coming from parent span "http.target"
 * @returns A sanitized URL string
 */
function buildUrlFromComponentRoute(
  componentRoute,
  params,
  headersDict,
  pathname,
) {
  const parameterizedPath = substituteRouteParams(componentRoute);
  // If available, the pathname from the http.target of the HTTP request server span takes precedence over the parameterized path.
  // Spans such as generateMetadata and Server Component rendering are typically direct children of that span.
  const path = pathname ?? sanitizeRoutePath(parameterizedPath);

  const protocol = headersDict?.[HeaderKeys.FORWARDED_PROTO];
  const host = headersDict?.[HeaderKeys.FORWARDED_HOST] || headersDict?.[HeaderKeys.HOST];

  if (!protocol || !host) {
    return path;
  }

  const fullUrl = `${protocol}://${host}${path}`;

  const urlObject = core.parseStringToURLObject(fullUrl);
  if (!urlObject) {
    return path;
  }

  return core.getSanitizedUrlStringFromUrlObject(urlObject);
}

/**
 * Returns a sanitized URL string from the referer header if it exists and is valid.
 *
 * @param headersDict - Optional headers containing the referer
 * @returns A sanitized URL string or undefined if referer is missing/invalid
 */
function extractSanitizedUrlFromRefererHeader(headersDict) {
  const referer = headersDict?.[HeaderKeys.REFERER];
  if (!referer) {
    return undefined;
  }

  try {
    const refererUrl = new URL(referer);
    return core.getSanitizedUrlStringFromUrlObject(refererUrl);
  } catch {
    return undefined;
  }
}

/**
 * Returns a sanitized URL string using the referer header if available,
 * otherwise constructs the URL from the component route, params, and headers.
 *
 * @param componentRoute - The route template to construct the URL from
 * @param params - Optional route parameters to replace in the template
 * @param headersDict - Optional headers containing protocol, host, and referer
 * @param pathname - Optional pathname coming from root span "http.target"
 * @returns A sanitized URL string
 */
function getSanitizedRequestUrl(
  componentRoute,
  params,
  headersDict,
  pathname,
) {
  const refererUrl = extractSanitizedUrlFromRefererHeader(headersDict);
  if (refererUrl) {
    return refererUrl;
  }

  return buildUrlFromComponentRoute(componentRoute, params, headersDict, pathname);
}

exports.buildUrlFromComponentRoute = buildUrlFromComponentRoute;
exports.extractSanitizedUrlFromRefererHeader = extractSanitizedUrlFromRefererHeader;
exports.getSanitizedRequestUrl = getSanitizedRequestUrl;
exports.sanitizeRoutePath = sanitizeRoutePath;
exports.substituteRouteParams = substituteRouteParams;
//# sourceMappingURL=urls.js.map
