import http from 'k6/http';
import { check, group, sleep } from 'k6';

const API_BASE_URL = __ENV.API_BASE_URL || 'http://localhost:3001/api/v1';
const TEST_EMAIL = __ENV.TEST_USER_EMAIL || '';
const TEST_PASSWORD = __ENV.TEST_USER_PASSWORD || '';

http.setResponseCallback(http.expectedStatuses({ min: 200, max: 499 }));

export const options = {
  scenarios: {
    auth_workflow: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '20s', target: 5 },
        { duration: '30s', target: 10 },
        { duration: '20s', target: 0 },
      ],
      gracefulRampDown: '20s',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<700', 'p(99)<1500'],
    http_req_failed: ['rate<0.2'],
  },
};

function maybeLogin() {
  if (!TEST_EMAIL || !TEST_PASSWORD) {
    return '';
  }

  const res = http.post(
    `${API_BASE_URL}/auth/login`,
    JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
    {
      headers: { 'Content-Type': 'application/json' },
    },
  );

  let token = '';
  try {
    const body = JSON.parse(res.body || '{}');
    token = body.accessToken || body.access_token || '';
  } catch {
    token = '';
  }

  check(res, {
    'auth login status is 2xx/4xx': (r) => r.status >= 200 && r.status < 500,
  });

  return token;
}

export default function enhancedScenarios() {
  let bearerToken = '';

  group('Auth Flow', () => {
    const checkEmailRes = http.post(
      `${API_BASE_URL}/auth/check-email`,
      JSON.stringify({ email: TEST_EMAIL || 'perf-check@docita.local' }),
      {
        headers: { 'Content-Type': 'application/json' },
      },
    );

    check(checkEmailRes, {
      'check-email status is 2xx/4xx': (r) => r.status >= 200 && r.status < 500,
    });

    bearerToken = maybeLogin();
    sleep(0.3);
  });

  group('Billing / Payment Flow', () => {
    const headers = {
      'Content-Type': 'application/json',
      ...(bearerToken ? { Authorization: `Bearer ${bearerToken}` } : {}),
    };

    const plansRes = http.get(`${API_BASE_URL}/pricing/plans`, { headers });
    check(plansRes, {
      'pricing plans status is 2xx/4xx': (r) => r.status >= 200 && r.status < 500,
    });

    const invoicesRes = http.get(`${API_BASE_URL}/invoices?page=1&limit=10`, {
      headers,
    });
    check(invoicesRes, {
      'invoice listing status is 2xx/4xx': (r) => r.status >= 200 && r.status < 500,
    });

    sleep(0.4);
  });

  group('System Health Sanity', () => {
    const healthRes = http.get(`${API_BASE_URL}/health`);
    check(healthRes, {
      'health status is 2xx/4xx': (r) => r.status >= 200 && r.status < 500,
    });

    const perfRes = http.get(`${API_BASE_URL}/performance/health`);
    check(perfRes, {
      'performance health status is 2xx/4xx': (r) => r.status >= 200 && r.status < 500,
    });

    sleep(0.3);
  });
}
