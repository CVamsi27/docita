import request from 'supertest';

/**
 * The global CsrfInterceptor requires the XSRF-TOKEN cookie + X-XSRF-TOKEN
 * header double-submit on mutating requests that carry no `Authorization:
 * Bearer` header (e.g. QR/mobile uploads, unauthenticated rejection probes).
 * GET /health mints the cookie; echo it back on the request under test.
 */
export async function getCsrfHeaders(server: string) {
  const response = await request(server).get('/health').expect(200);
  const cookies = response.get('Set-Cookie') ?? [];
  const csrfCookie = cookies.find((cookie) => cookie.startsWith('XSRF-TOKEN='));
  if (!csrfCookie) throw new Error('CSRF cookie was not issued by /health');
  const token = csrfCookie.split(';')[0]?.split('=')[1];
  if (!token) throw new Error('CSRF cookie did not contain a token');
  return {
    cookie: `XSRF-TOKEN=${token}`,
    token,
  };
}
