// fallow-ignore-file coverage-gaps
export function parseHostname(value: string): string | null {
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return null;
  }
}

export function emailLinkBaseUrlFromAppUrl(
  appUrl: string,
  isDevelopment: boolean,
): string {
  const trimmed = appUrl.trim().replace(/\/+$/, '');
  if (!isDevelopment) return trimmed;
  try {
    const parsed = new URL(
      /^[a-zA-Z][a-zA-Z+\-.]*:\/\//.test(trimmed)
        ? trimmed
        : `http://${trimmed}`,
    );
    parsed.protocol = 'http:';
    const path = parsed.pathname.replace(/\/+$/, '');
    if (path && path !== '/') {
      return `${parsed.origin}${path}`;
    }
    return parsed.origin;
  } catch {
    return trimmed;
  }
}

export function resolveSharedCookieDomain(
  hostnames: string[],
): string | undefined {
  const normalizedHosts = hostnames
    .map((hostname) => hostname.trim().toLowerCase())
    .filter(Boolean);

  if (normalizedHosts.length < 2) return undefined;

  if (
    normalizedHosts.some(
      (hostname) => hostname === 'localhost' || isIpAddress(hostname),
    )
  ) {
    return undefined;
  }

  const splitHosts = normalizedHosts.map((hostname) => hostname.split('.'));
  const minLength = Math.min(...splitHosts.map((segments) => segments.length));
  const sharedSegments: string[] = [];

  for (let index = 1; index <= minLength; index += 1) {
    const segment = splitHosts[0].at(-index);
    if (!segment) {
      break;
    }

    if (splitHosts.every((parts) => parts.at(-index) === segment)) {
      sharedSegments.unshift(segment);
      continue;
    }

    break;
  }

  if (sharedSegments.length < 2) return undefined;

  return sharedSegments.join('.');
}

export function isIpAddress(hostname: string): boolean {
  return /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname) || hostname.includes(':');
}
