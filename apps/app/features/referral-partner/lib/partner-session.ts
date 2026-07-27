"use client";

/**
 * Local session for the partner self-service portal. The partner is a
 * separate audience from the main app user — different storage key,
 * different cookie behavior, and a different audience on the JWT.
 * Mirrors the role/audience separation done by `appSession` in
 * `@/lib/auth/session` for the main app.
 */

const STORAGE_KEY = "docita_partner_session";
const REFRESH_KEY = "docita_partner_refresh";

interface PartnerSessionShape {
  accessToken: string;
  referrerId: string;
  name: string;
  code: string;
  type: "CLINIC" | "PHARMACY" | "MARKETING_PERSON" | "CUSTOM";
  /** Epoch ms when the access token expires. */
  expiresAt: number;
}

interface PersistedShape {
  session: PartnerSessionShape;
  refreshToken: string | null;
}

function readPersisted(): PersistedShape | null {
  if (typeof window === "undefined") return null;
  const sessionRaw = window.localStorage.getItem(STORAGE_KEY);
  if (!sessionRaw) return null;
  try {
    const session = JSON.parse(sessionRaw) as PartnerSessionShape;
    return {
      session,
      refreshToken: window.localStorage.getItem(REFRESH_KEY),
    };
  } catch {
    return null;
  }
}

function writePersisted(state: PersistedShape | null): void {
  if (typeof window === "undefined") return;
  if (!state) {
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem(REFRESH_KEY);
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state.session));
  if (state.refreshToken) {
    window.localStorage.setItem(REFRESH_KEY, state.refreshToken);
  } else {
    window.localStorage.removeItem(REFRESH_KEY);
  }
}

export const partnerSession = {
  get(): PersistedShape | null {
    return readPersisted();
  },
  getAccessToken(): string | null {
    const persisted = readPersisted();
    if (!persisted) return null;
    if (persisted.session.expiresAt <= Date.now()) return null;
    return persisted.session.accessToken;
  },
  set(
    session: PartnerSessionShape,
    refreshToken: string | null,
  ): void {
    writePersisted({ session, refreshToken });
  },
  setAccessToken(accessToken: string, expiresAt: number): void {
    const persisted = readPersisted();
    if (!persisted) return;
    writePersisted({
      session: { ...persisted.session, accessToken, expiresAt },
      refreshToken: persisted.refreshToken,
    });
  },
  clear(): void {
    writePersisted(null);
  },
};

export type { PartnerSessionShape };
