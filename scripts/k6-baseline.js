import http from 'k6/http';
import { check, group, sleep } from 'k6';

http.setResponseCallback(http.expectedStatuses(200, 401, 404));

// Configuration
const API_BASE_URL = __ENV.API_BASE_URL || 'http://localhost:3001/api/v1';
const ADMIN_TOKEN = __ENV.ADMIN_TOKEN || '';
const QUICK_MODE = __ENV.K6_QUICK === '1';

// Threshold configuration
export const options = {
  stages: QUICK_MODE
    ? [
        { duration: '10s', target: 5 },
        { duration: '20s', target: 10 },
        { duration: '10s', target: 0 },
      ]
    : [
        { duration: '30s', target: 10 },
        { duration: '2m', target: 25 },
        { duration: '30s', target: 50 },
        { duration: '30s', target: 0 },
      ],
  thresholds: {
    'http_req_duration': ['p(95)<500', 'p(99)<1000'],
    'http_req_failed': ['rate<0.1'],
    'http_reqs': ['count>0'],
  },
};

export default function baseline() {
  const headers = {
    'Content-Type': 'application/json',
    ...(ADMIN_TOKEN ? { Authorization: `Bearer ${ADMIN_TOKEN}` } : {}),
  };

  group('Health & Public Endpoints', function () {
    // Health check
    let res = http.get(`${API_BASE_URL}/health`, { headers });
    check(res, {
      'health status is 200': (r) => r.status === 200,
    });
    sleep(0.5);
  });

  group('Patient Endpoints', function () {
    // List patients (GET)
    let res = http.get(`${API_BASE_URL}/patients?limit=10`, { headers });
    check(res, {
      'list patients status is 200 or 401': (r) =>
        r.status === 200 || r.status === 401,
      'response time < 500ms': (r) => r.timings.duration < 500,
    });
    sleep(0.5);

    // Get single patient
    res = http.get(`${API_BASE_URL}/patients/test-patient-id`, { headers });
    check(res, {
      'get patient status is 2xx or 4xx': (r) => r.status >= 200 && r.status < 500,
    });
    sleep(0.5);
  });

  group('Appointment Endpoints', function () {
    // List appointments (GET)
    let res = http.get(`${API_BASE_URL}/appointments?limit=10`, { headers });
    check(res, {
      'list appointments status is 200 or 401': (r) =>
        r.status === 200 || r.status === 401,
      'response time < 500ms': (r) => r.timings.duration < 500,
    });
    sleep(0.5);
  });

  group('Monitoring Endpoints', function () {
    // Get system health
    let res = http.get(`${API_BASE_URL}/monitoring/health`, { headers });
    check(res, {
      'monitoring health status is 200 or 401': (r) =>
        r.status === 200 || r.status === 401,
    });
    sleep(0.5);

    // Get error stats
    res = http.get(`${API_BASE_URL}/monitoring/errors`, { headers });
    check(res, {
      'error stats status is 2xx or 401': (r) =>
        (r.status >= 200 && r.status < 300) || r.status === 401,
    });
    sleep(0.5);
  });
}
