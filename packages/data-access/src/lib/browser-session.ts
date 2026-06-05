export interface BrowserSessionConfig {
  apiUrl: string;
  resolveApiUrl?: () => string;
  tokenStorageKey: string;
  userStorageKey?: string;
  refreshEndpoint?: string;
  csrfCookieKey?: string;
  loginPath?: string;
  resolveLoginPath?: (currentPath: string) => string;
  publicPaths?: string[];
  redirectStorageKey?: string;
}

export interface BrowserSessionManager {
  getToken: () => string | null;
  setToken: (token: string | null) => void;
  clearSession: () => void;
  getCsrfToken: () => string | null;
  setCsrfToken: (token: string | null) => void;
  captureCsrfFromResponse: (response: Response) => void;
  refreshAccessToken: () => Promise<boolean>;
  redirectToLogin: (pathname?: string) => void;
  isPublicPath: (pathname: string) => boolean;
}

interface NormalizedBrowserSessionConfig {
  apiUrl: string;
  resolveApiUrl?: () => string;
  tokenStorageKey: string;
  userStorageKey?: string;
  refreshEndpoint: string;
  csrfCookieKey: string;
  loginPath: string;
  resolveLoginPath?: (currentPath: string) => string;
  publicPaths: string[];
  redirectStorageKey: string;
}

interface BrowserSessionState {
  config: NormalizedBrowserSessionConfig;
  refreshKey: string;
  inMemoryToken: string | null;
  inMemoryCsrfToken: string | null;
}

const refreshInFlight = new Map<string, Promise<boolean>>();

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function normalizeApiUrl(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function toRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return Object.fromEntries(Object.entries(value));
}

function extractAccessToken(payload: unknown): string | null {
  const direct = toRecord(payload)?.["access_token"];
  if (typeof direct === "string" && direct.length > 0) {
    return direct;
  }

  const nested = toRecord(toRecord(payload)?.["data"])?.["access_token"];
  if (typeof nested === "string" && nested.length > 0) {
    return nested;
  }

  return null;
}

function normalizeBrowserSessionConfig(
  config: BrowserSessionConfig,
): NormalizedBrowserSessionConfig {
  return {
    apiUrl: config.apiUrl,
    resolveApiUrl: config.resolveApiUrl,
    tokenStorageKey: config.tokenStorageKey,
    userStorageKey: config.userStorageKey,
    refreshEndpoint: config.refreshEndpoint ?? "/auth/refresh",
    csrfCookieKey: config.csrfCookieKey ?? "XSRF-TOKEN",
    loginPath: config.loginPath ?? "/login",
    resolveLoginPath: config.resolveLoginPath,
    publicPaths: config.publicPaths ?? [
      "/login",
      "/register",
      "/forgot-password",
      "/reset-password",
    ],
    redirectStorageKey: config.redirectStorageKey ?? "redirectAfterLogin",
  };
}

function removeLocalStorageItem(storageKey: string | undefined): void {
  if (!storageKey || !isBrowser()) return;
  try {
    localStorage.removeItem(storageKey);
  } catch {
    return;
  }
}

function removeLegacyStoredAccessToken(config: NormalizedBrowserSessionConfig) {
  removeLocalStorageItem(config.tokenStorageKey);
}

function getActiveApiUrl(state: BrowserSessionState): string {
  const { apiUrl, resolveApiUrl } = state.config;
  return normalizeApiUrl(resolveApiUrl?.() ?? apiUrl);
}

function getCsrfTokenFromCookie(cookieKey: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${cookieKey}=([^;]*)`),
  );
  const encoded = match?.[1];
  return encoded ? decodeURIComponent(encoded) : null;
}

function getCsrfToken(state: BrowserSessionState): string | null {
  return (
    state.inMemoryCsrfToken ??
    getCsrfTokenFromCookie(state.config.csrfCookieKey)
  );
}

function captureCsrfFromResponse(
  state: BrowserSessionState,
  response: Response,
): void {
  const headerToken = response.headers.get("X-CSRF-Token");
  if (headerToken && headerToken.length > 0) {
    state.inMemoryCsrfToken = headerToken;
  }
}

function setCsrfToken(
  state: BrowserSessionState,
  token: string | null,
): void {
  state.inMemoryCsrfToken = token;
}

function clearSession(state: BrowserSessionState): void {
  state.inMemoryToken = null;
  removeLocalStorageItem(state.config.tokenStorageKey);
  removeLocalStorageItem(state.config.userStorageKey);
}

function isPublicPath(
  state: BrowserSessionState,
  pathname: string,
): boolean {
  return state.config.publicPaths.some((path) => pathname.startsWith(path));
}

function isPublicRoute(state: BrowserSessionState): boolean {
  if (!isBrowser()) return false;
  return isPublicPath(state, window.location.pathname);
}

function resolveReturnPath(pathname?: string): {
  fullReturnPath: string;
  pathOnly: string;
} {
  if (pathname === undefined) {
    return {
      fullReturnPath: `${window.location.pathname}${window.location.search}`,
      pathOnly: window.location.pathname,
    };
  }

  const queryIndex = pathname.indexOf("?");
  return {
    fullReturnPath: pathname,
    pathOnly: queryIndex === -1 ? pathname : pathname.slice(0, queryIndex),
  };
}

function storeReturnPath(
  redirectStorageKey: string,
  fullReturnPath: string,
): void {
  const priorRedirect = sessionStorage.getItem(redirectStorageKey)?.trim();
  if (!priorRedirect) {
    sessionStorage.setItem(redirectStorageKey, fullReturnPath);
  }
}

function redirectToLogin(
  state: BrowserSessionState,
  pathname?: string,
): void {
  if (!isBrowser()) return;

  const { fullReturnPath, pathOnly } = resolveReturnPath(pathname);
  if (isPublicPath(state, pathOnly)) return;

  const { redirectStorageKey, resolveLoginPath, loginPath } = state.config;
  storeReturnPath(redirectStorageKey, fullReturnPath);
  window.location.assign(resolveLoginPath?.(pathOnly) ?? loginPath);
}

async function bootstrapCsrfToken(state: BrowserSessionState): Promise<void> {
  if (!isBrowser() || state.inMemoryCsrfToken) return;
  try {
    const bootstrapResponse = await fetch(`${getActiveApiUrl(state)}/health`, {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    captureCsrfFromResponse(state, bootstrapResponse);
  } catch {
    return;
  }
}

async function fetchRefreshResponse(
  state: BrowserSessionState,
  csrfToken: string | null,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15_000);
  try {
    return await fetch(
      `${getActiveApiUrl(state)}${state.config.refreshEndpoint}`,
      {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(csrfToken ? { "x-xsrf-token": csrfToken } : {}),
        },
        body: JSON.stringify({}),
        signal: controller.signal,
      },
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

async function executeRefreshAccessToken(
  state: BrowserSessionState,
): Promise<boolean> {
  if (!state.inMemoryCsrfToken) {
    await bootstrapCsrfToken(state);
  }

  const response = await fetchRefreshResponse(state, getCsrfToken(state));
  captureCsrfFromResponse(state, response);

  if (!response.ok) {
    return false;
  }

  const payload = await response.json().catch(() => null);
  const nextToken = extractAccessToken(payload);
  if (!nextToken) {
    return false;
  }

  state.inMemoryToken = nextToken;
  return true;
}

async function refreshAccessToken(state: BrowserSessionState): Promise<boolean> {
  if (!isBrowser() || isPublicRoute(state)) return false;

  const inFlight = refreshInFlight.get(state.refreshKey);
  if (inFlight) {
    return inFlight;
  }

  const refreshPromise = executeRefreshAccessToken(state)
    .catch(() => false)
    .finally(() => {
      refreshInFlight.delete(state.refreshKey);
    });

  refreshInFlight.set(state.refreshKey, refreshPromise);
  return refreshPromise;
}

function createBrowserSessionState(
  config: BrowserSessionConfig,
): BrowserSessionState {
  const normalizedConfig = normalizeBrowserSessionConfig(config);
  removeLegacyStoredAccessToken(normalizedConfig);
  return {
    config: normalizedConfig,
    refreshKey: normalizedConfig.tokenStorageKey,
    inMemoryToken: null,
    inMemoryCsrfToken: null,
  };
}

export function createBrowserSessionManager(
  config: BrowserSessionConfig,
): BrowserSessionManager {
  const state = createBrowserSessionState(config);
  return {
    getToken: () => state.inMemoryToken,
    setToken: (token) => {
      state.inMemoryToken = token ?? null;
    },
    clearSession: () => clearSession(state),
    getCsrfToken: () => getCsrfToken(state),
    setCsrfToken: (token) => setCsrfToken(state, token),
    captureCsrfFromResponse: (response) =>
      captureCsrfFromResponse(state, response),
    refreshAccessToken: () => refreshAccessToken(state),
    redirectToLogin: (pathname) => redirectToLogin(state, pathname),
    isPublicPath: (pathname) => isPublicPath(state, pathname),
  };
}
