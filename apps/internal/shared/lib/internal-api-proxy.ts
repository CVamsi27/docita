import {
  normalizeUpstreamApiUrl,
  resolveUpstreamApiBaseUrl,
} from "@workspace/utils/http/upstream-api-proxy";

const INTERNAL_PRODUCTION_HOST = "internal.docita.work";
const INTERNAL_STAGING_HOST = "staging-internal.docita.work";
const PRODUCTION_API_BASE_URL = "https://api.docita.work/api/v1";
const STAGING_API_BASE_URL = "https://staging-api.docita.work/api/v1";

type Env = Record<string, string | undefined>;

export function shouldProxyInternalApiRequest(
  hostname: string,
  env: Env = process.env,
) {
  return (
    env["DOCITA_CLOUDFLARE"] === "1" ||
    Boolean(env["API_URL"] || env["API_PROXY_TARGET"]) ||
    hostname === INTERNAL_PRODUCTION_HOST ||
    hostname === INTERNAL_STAGING_HOST
  );
}

export function resolveInternalApiProxyBaseUrl(
  hostname: string,
  env: Env = process.env,
) {
  if (env["API_URL"] || env["API_PROXY_TARGET"]) {
    return resolveUpstreamApiBaseUrl(env);
  }

  if (hostname === INTERNAL_STAGING_HOST) {
    return STAGING_API_BASE_URL;
  }

  return normalizeUpstreamApiUrl(PRODUCTION_API_BASE_URL);
}
