import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';
import { BASE_URL, authHeaders } from '../lib/config.js';

/**
 * Sustained read load against /patients with pagination. Validates that
 * tenant guard + rate limit + DB indexes hold up at the target SLO
 * (p95 < 800ms for a 50-row page).
 */

const listLatency = new Trend('patients_list_latency_ms', true);

export const options = {
  scenarios: {
    sustained: {
      executor: 'constant-arrival-rate',
      rate: 50,
      timeUnit: '1s',
      duration: '2m',
      preAllocatedVUs: 50,
      maxVUs: 200,
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<800'],
    patients_list_latency_ms: ['p(95)<800'],
  },
};

export default function patientsList() {
  const page = (__ITER % 200) + 1;
  const res = http.get(
    `${BASE_URL}/patients?page=${page}&pageSize=50`,
    {
      headers: authHeaders(),
      tags: { scenario: 'patients-list' },
    },
  );
  listLatency.add(res.timings.duration);
  check(res, {
    'status is 200': (r) => r.status === 200,
    'returns array': (r) => {
      try {
        const body = r.json();
        return body && Array.isArray(body.items ?? body.data ?? body);
      } catch (_err) {
        return false;
      }
    },
  });
  sleep(0.1);
}
