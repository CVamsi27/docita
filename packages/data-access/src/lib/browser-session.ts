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
  const readPersistedToken = (): string | null => {
    if (!isBrowser()) return null;

    const persistedToken = localStorage.getItem(tokenStorageKey);
    return persistedToken && persistedToken.length > 0 ? persistedToken : null;
  };

  let inMemoryToken: string | null = readPersistedToken();

  const normalizeApiUrl = (value: string) =>
    value.endsWith("/") ? value.slice(0, -1) : value;

  const syncTokenStorage = (token: string | null): void => {
    if (!isBrowser()) return;
    if (token) {
      localStorage.setItem(tokenStorageKey, token);
    } else {
      localStorage.removeItem(tokenStorageKey);
    }
  };

  const getCsrfToken = (): string | null => {
    if (typeof document === "undefined") return null;
    const match = document.cookie.match(
      new RegExp(`(?:^|;\\s*)${csrfCookieKey}=([^;]*)`),
    );
    const encoded = match?.[1];
    return encoded ? decodeURIComponent(encoded) : null;
  };

  const getToken = (): string | null => {
    if (!isBrowser()) {
      return inMemoryToken;
    }

    const persistedToken = readPersistedToken();
    if (persistedToken !== inMemoryToken) {
      inMemoryToken = persistedToken;
    }

    return inMemoryToken;
  };

  const setToken = (token: string | null): void => {
    inMemoryToken = token ?? null;
    syncTokenStorage(inMemoryToken);
  };

  const clearSession = (): void => {
    inMemoryToken = null;
    syncTokenStorage(null);
    if (!isBrowser()) return;
    if (userStorageKey) {
      localStorage.removeItem(userStorageKey);
    }
  };

  const isPublicPath = (pathname: string): boolean =>
    publicPaths.some((path) => pathname.startsWith(path));

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
    refreshAccessToken,
    redirectToLogin,
    isPublicPath,
  };
}
