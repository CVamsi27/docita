export interface BrowserSessionConfig {
  apiUrl: string;
  tokenStorageKey: string;
  userStorageKey?: string;
  refreshEndpoint?: string;
  csrfCookieKey?: string;
  loginPath?: string;
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
    publicPaths = ["/login", "/register", "/forgot-password", "/reset-password"],
    redirectStorageKey = "redirectAfterLogin",
  } = config;

  const refreshKey = `${apiUrl}::${tokenStorageKey}`;

  const normalizeApiUrl = (value: string) =>
    value.endsWith("/") ? value.slice(0, -1) : value;

  const getCsrfToken = (): string | null => {
    if (typeof document === "undefined") return null;
    const match = document.cookie.match(
      new RegExp(`(?:^|;\\s*)${csrfCookieKey}=([^;]*)`),
    );
    const encoded = match?.[1];
    return encoded ? decodeURIComponent(encoded) : null;
  };

  const getToken = (): string | null => {
    if (!isBrowser()) return null;
    return localStorage.getItem(tokenStorageKey);
  };

  const setToken = (token: string | null): void => {
    if (!isBrowser()) return;
    if (token) {
      localStorage.setItem(tokenStorageKey, token);
      return;
    }
    localStorage.removeItem(tokenStorageKey);
  };

  const clearSession = (): void => {
    if (!isBrowser()) return;
    localStorage.removeItem(tokenStorageKey);
    if (userStorageKey) {
      localStorage.removeItem(userStorageKey);
    }
  };

  const isPublicPath = (pathname: string): boolean =>
    publicPaths.some((path) => pathname.startsWith(path));

  const redirectToLogin = (pathname?: string): void => {
    if (!isBrowser()) return;
    const currentPath = pathname ?? window.location.pathname;
    if (!isPublicPath(currentPath)) {
      sessionStorage.setItem(redirectStorageKey, currentPath);
      window.location.href = loginPath;
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
