/**
 * HTTP-Only Cookie based token storage
 * Never expose tokens to JavaScript (security best practice)
 * API handles token storage in secure HTTP-only cookies
 */

export const tokenStorage = {
  /**
   * Get current auth state
   * Tokens are stored in HTTP-only cookies by API
   * Frontend only tracks if user is authenticated
   */
  getToken: (): string | null => {
    // Token is in HTTP-only cookie, not accessible from JS
    // This is intentional for security
    return null;
  },

  /**
   * Set token - handled by API via Set-Cookie header
   * Frontend should never set tokens directly
   */
  setToken: (_token: string): void => {
    // Do not implement - tokens set by API via Set-Cookie
    console.warn(
      'Tokens are managed by the API via HTTP-only cookies. Do not set tokens from the frontend.'
    );
  },

  /**
   * Clear token - handled by API logout endpoint
   */
  clearToken: (): void => {
    // Token clearing handled by API logout endpoint
    // which sends Set-Cookie: token=; Max-Age=0
  },

  /**
   * Refresh token - handled by API /auth/refresh endpoint
   * Frontend should call refreshAuth() from useAuth hook
   */
  refreshToken: async (): Promise<void> => {
    const response = await fetch('/api/v1/auth/refresh', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error('Token refresh failed');
    }
  },

  /**
   * Get CSRF token from meta tag
   * Used for form submissions and state-changing requests
   */
  getCsrfToken: (): string | null => {
    const token = document
      .querySelector('meta[name="csrf-token"]')
      ?.getAttribute('content');
    return token || null;
  },
};
