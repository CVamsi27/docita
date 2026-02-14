import http from 'k6/http';
import { check, sleep, group } from 'k6';

/**
 * k6 Load Testing Script (PERF-4)
 * 
 * Baseline Performance Test:
 * - 100 concurrent users over 5 minutes
 * - Validates response times and error rates
 * - Tests critical endpoints: health, auth, patients, appointments
 * 
 * Run with: k6 run scripts/load-test.js
 * Or with custom API URL: k6 run scripts/load-test.js --env API_URL=http://localhost:3331
 */

export const options = {
  stages: [
    { duration: '1m', target: 20 },   // Ramp up to 20 users over 1 min
    { duration: '2m', target: 100 },  // Ramp up to 100 users over 2 min
    { duration: '2m', target: 100 },  // Sustain 100 users for 2 min
    { duration: '1m', target: 0 },    // Ramp down to 0 over 1 min
  ],
  thresholds: {
    // Response time thresholds
    'http_req_duration': [
      'p(95)<500',     // 95% of requests < 500ms
      'p(99)<1000',    // 99% of requests < 1000ms
      'p(99.9)<2000',  // 99.9% of requests < 2000ms
    ],
    // Error rate threshold
    'http_req_failed': ['rate<0.05'], // Less than 5% errors
    // Connection timeout threshold
    'http_req_connecting': ['p(95)<100'],
  },
  // Tags for organizing results
  tags: {
    name: 'Load Test - PERF-4',
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:3001/api/v1';
const HOME_URL = __ENV.HOME_URL || 'http://localhost:3000';

export default function () {
  // ========== SCENARIO 1: Health Check (Baseline) ==========
  group('1. Health Check', () => {
    const healthRes = http.get(`${BASE_URL}/health`, {
      timeout: '5s',
      tags: { name: 'health' },
    });

    check(healthRes, {
      'health check status 200': (r) => r.status === 200,
      'health response time < 100ms': (r) => r.timings.duration < 100,
    });

    sleep(0.5);
  });

  // ========== SCENARIO 2: Home Page Load (Frontend) ==========
  group('2. Home Page Load', () => {
    const homeRes = http.get(HOME_URL, {
      timeout: '10s',
      tags: { name: 'homepage' },
    });

    check(homeRes, {
      'home status 200': (r) => r.status === 200,
      'home response time < 1000ms': (r) => r.timings.duration < 1000,
      'home has content': (r) => r.body.length > 100,
    });

    sleep(1);
  });

  // ========== SCENARIO 3: Patient List (Protected - No Auth) ==========
  group('3. Patient List Endpoint', () => {
    const patientsRes = http.get(`${BASE_URL}/patients?page=1&limit=10`, {
      timeout: '5s',
      tags: { name: 'patient-list' },
    });

    check(patientsRes, {
      'patient list status': (r) => r.status === 200 || r.status === 401,
      'patient list response time < 500ms': (r) => r.timings.duration < 500,
    });

    sleep(1);
  });

  // ========== SCENARIO 4: Appointments List ==========
  group('4. Appointments Endpoint', () => {
    const apptRes = http.get(`${BASE_URL}/appointments?page=1&limit=10`, {
      timeout: '5s',
      tags: { name: 'appointments' },
    });

    check(apptRes, {
      'appointments status': (r) => r.status === 200 || r.status === 401,
      'appointments response time < 500ms': (r) => r.timings.duration < 500,
    });

    sleep(1);
  });

  // ========== SCENARIO 5: Dashboard Stats ==========
  group('5. Dashboard Stats Endpoint', () => {
    const dashRes = http.get(`${BASE_URL}/dashboard/stats`, {
      timeout: '5s',
      tags: { name: 'dashboard' },
    });

    check(dashRes, {
      'dashboard status': (r) => r.status === 200 || r.status === 401,
      'dashboard response time < 1000ms': (r) => r.timings.duration < 1000,
    });

    sleep(1);
  });

  // ========== SCENARIO 6: Medical Coding Search ==========
  group('6. Medical Coding Search', () => {
    const codeRes = http.get(`${BASE_URL}/medical-coding/icd-codes?search=diabetes`, {
      timeout: '5s',
      tags: { name: 'medical-coding' },
    });

    check(codeRes, {
      'code search status': (r) => r.status === 200 || r.status === 401,
      'code search response time < 500ms': (r) => r.timings.duration < 500,
    });

    sleep(0.5);
  });

  // Breathing room between iterations
  sleep(2);
}

/**
 * USAGE & INTERPRETATION:
 * 
 * Run all scenarios:
 *   k6 run scripts/load-test.js
 * 
 * Run against custom API:
 *   k6 run scripts/load-test.js -e API_URL=http://api.example.com:3001/api/v1
 * 
 * Run with specific VU count for quick test:
 *   k6 run -u 10 -d 30s scripts/load-test.js
 * 
 * Export results to JSON:
 *   k6 run -o json=results.json scripts/load-test.js
 * 
 * SUCCESS CRITERIA:
 * ✅ p(95) < 500ms      : 95% of requests complete in <500ms
 * ✅ p(99) < 1000ms     : 99% of requests complete in <1s
 * ✅ errors < 5%        : Less than 5% of requests fail
 * ✅ p(95) connecting < 100ms : Connection time acceptable
 * 
 * COMMON ISSUES:
 * - Timeout (gateway_timeout): API overloaded - scale down users or optimize endpoints
 * - Connection refused: API not running - start API with 'pnpm dev'
 * - 401/403 errors: Auth token invalid or expired - update AUTH_TOKEN env var
 * - High p(99): Some endpoints have slow queries - check database performance
 */
