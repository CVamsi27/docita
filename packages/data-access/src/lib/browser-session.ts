export interface BrowserSessionConfig {
  apiUrl: string;
  tokenStorageKey: string;
  userStorageKey?: string;
  refreshEndpoint?: string;
  csrfCookieKey?: string;
  loginPath?: string;
  resolveLoginPath?: (currentPath: string) => string;
  publicPaths?: string[];
  redirectStorageKey?: string;
}

const refreshInFlight = new Map<string, Promise<boolean>>();

function isBrowser(): boolean {
  return typeof window !== "undefined";
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

export function createBrowserSessionManager(config: BrowserSessionConfig) {
  const {
    apiUrl,
    tokenStorageKey,
    userStorageKey,
    refreshEndpoint = "/auth/refresh",
    csrfCookieKey = "XSRF-TOKEN",
    loginPath = "/login",
    resolveLoginPath,
    publicPaths = ["/login", "/register", "/forgot-password", "/reset-password"],
    redirectStorageKey = "redirectAfterLogin",
  } = config;

  const refreshKey = `${apiUrl}::${tokenStorageKey}`;

  /**
   * Access tokens are NO LONGER persisted to localStorage.
   *
   * The httpOnly `access_token` cookie is the durable session credential;
   * the in-memory token below only exists so non-cookie-bearing channels
   * (wss:// socket auth to api.docita.work, monitoring beacons that ride
   * cross-origin) can still attach Authorization headers within a session.
   *
   * On hard reload the in-memory token is empty until the bootstrap
   * refresh fetch (which rides the refresh-token cookie) returns a new
   * one. This eliminates the XSS-readable token surface.
   *
   * Any stored token from a previous version of the client is removed
   * on first load so it cannot be exfiltrated post-upgrade.
   */
  if (isBrowser()) {
    try {
      localStorage.removeItem(tokenStorageKey);
    } catch {
      // ignore — quota / disabled storage
    }
  }

  let inMemoryToken: string | null = null;
  let inMemoryCsrfToken: string | null = null;

  const normalizeApiUrl = (value: string) =>
    value.endsWith("/") ? value.slice(0, -1) : value;

  const getCsrfToken = (): string | null => {
    if (inMemoryCsrfToken) {
      return inMemoryCsrfToken;
    }
    if (typeof document === "undefined") return null;
    const match = document.cookie.match(
      new RegExp(`(?:^|;\\s*)${csrfCookieKey}=([^;]*)`),
    );
    const encoded = match?.[1];
    return encoded ? decodeURIComponent(encoded) : null;
  };

  const captureCsrfFromResponse = (response: Response): void => {
    const headerToken = response.headers.get("X-CSRF-Token");
    if (headerToken && headerToken.length > 0) {
      inMemoryCsrfToken = headerToken;
    }
  };

  const setCsrfToken = (token: string | null): void => {
    inMemoryCsrfToken = token;
  };

  const getToken = (): string | null => inMemoryToken;

  const setToken = (token: string | null): void => {
    inMemoryToken = token ?? null;
  };

  const clearSession = (): void => {
    inMemoryToken = null;
    if (!isBrowser()) return;
    // Defensive: nuke any legacy stored token from prior client versions.
    try {
      localStorage.removeItem(tokenStorageKey);
    } catch {
      // ignore
    }
    if (userStorageKey) {
      try {
        localStorage.removeItem(userStorageKey);
      } catch {
        // ignore
      }
    }
  };

  const isPublicPath = (pathname: string): boolean =>
    publicPaths.some((path) => pathname.startsWith(path));

  const isPublicRoute = (): boolean => {
    if (!isBrowser()) return false;
    return isPublicPath(window.location.pathname);
  };

  const redirectToLogin = (pathname?: string): void => {
    if (!isBrowser()) return;

    let fullReturnPath: string;
    let pathOnly: string;

    if (pathname !== undefined) {
      const queryIndex = pathname.indexOf("?");
      if (queryIndex === -1) {
        fullReturnPath = pathname;
        pathOnly = pathname;
      } else {
        fullReturnPath = pathname;
        pathOnly = pathname.slice(0, queryIndex);
      }
    } else {
      fullReturnPath = `${window.location.pathname}${window.location.search}`;
      pathOnly = window.location.pathname;
    }

    if (!isPublicPath(pathOnly)) {
      const priorRedirect = sessionStorage.getItem(redirectStorageKey)?.trim();
      if (!priorRedirect) {
        sessionStorage.setItem(redirectStorageKey, fullReturnPath);
      }
      window.location.assign(resolveLoginPath?.(pathOnly) ?? loginPath);
    }
  };

  const refreshAccessToken = async (): Promise<boolean> => {
    if (!isBrowser()) return false;
    if (isPublicRoute()) return false;

    const inFlight = refreshInFlight.get(refreshKey);
    if (inFlight) {
      return inFlight;
    }

    const refreshPromise = (async () => {
      try {
        const csrfToken = getCsrfToken();
        const response = await fetch(
          `${normalizeApiUrl(apiUrl)}${refreshEndpoint}`,
          {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
              ...(csrfToken ? { "X-XSRF-TOKEN": csrfToken } : {}),
            },
            body: JSON.stringify({}),
          },
        );

        captureCsrfFromResponse(response);

        if (!response.ok) {
          return false;
        }

        const payload = await response.json().catch(() => null);
        const nextToken = extractAccessToken(payload);
        if (nextToken) {
          setToken(nextToken);
          return true;
        }

        return false;
      } catch {
        return false;
      } finally {
        refreshInFlight.delete(refreshKey);
      }
    })();

    refreshInFlight.set(refreshKey, refreshPromise);
    return refreshPromise;
  };

  return {
    getToken,
    setToken,
    clearSession,
    getCsrfToken,
    setCsrfToken,
    captureCsrfFromResponse,
    refreshAccessToken,
    redirectToLogin,
    isPublicPath,
  };
}
