import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';
import { BASE_URL } from '../lib/config.js';

/**
 * Login burst — exercises auth + rate limiting + token issuance under a
 * realistic ramp. Uses the seeded perf user (set K6_PERF_EMAIL /
 * K6_PERF_PASSWORD); never feed real PHI / production credentials.
 */

const loginLatency = new Trend('login_latency_ms', true);

export const options = {
  scenarios: {
    burst: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 25 },
        { duration: '1m', target: 100 },
        { duration: '30s', target: 0 },
      ],
      gracefulRampDown: '15s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.02'],
    http_req_duration: ['p(95)<1500'],
    login_latency_ms: ['p(95)<1500'],
  },
};

const EMAIL = __ENV.K6_PERF_EMAIL || 'perf@docita.test';
const PASSWORD = __ENV.K6_PERF_PASSWORD || 'PerfPassword#2026';

export default function loginScenario() {
  const res = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ email: EMAIL, password: PASSWORD }),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { scenario: 'auth-login' },
    },
  );
  loginLatency.add(res.timings.duration);
  check(res, {
    'status is 200/201': (r) => r.status === 200 || r.status === 201,
    'returns access token': (r) => {
      try {
        const body = r.json();
        return Boolean(body && body.accessToken);
      } catch (_err) {
        return false;
      }
    },
  });
  sleep(1);
}
