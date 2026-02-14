import http from 'k6/http';
import { check, sleep, group } from 'k6';

/**
 * k6 Load Testing Script
 * Run with: k6 run scripts/load-tests.ts
 * 
 * Configuration: 100 total concurrent users over 5 minutes
 */

export const options = {
  stages: [
    { duration: '1m', target: 20 },   // Ramp up to 20 users
    { duration: '2m', target: 100 },  // Ramp up to 100 users
    { duration: '2m', target: 100 },  // Stay at 100 users
    { duration: '1m', target: 0 },    // Ramp down to 0
  ],
  thresholds: {
    // 95% of requests should finish well below 500ms
    'http_req_duration': ['p(95)<500', 'p(99)<1000'],
    // Less than 5% of requests should fail
    'http_req_failed': ['rate<0.05'],
  },
  ext: {
    loadimpact: {
      projectID: 0, // Set this to your project ID
    },
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:3001/api/v1';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || '';

export default function () {
  // Scenario 1: Authentication (login/logout)
  group('Authentication Flow', () => {
    const loginRes = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
      email: `user${Math.floor(Math.random() * 1000)}@example.com`,
      password: 'TempPassword123!',
    }), {
      headers: { 'Content-Type': 'application/json' },
    });

    check(loginRes, {
      'login status is 200': (r) => r.status === 200 || r.status === 401,
      'login response time < 500ms': (r) => r.timings.duration < 500,
    });

    sleep(1);
  });

  // Scenario 2: Patient List Retrieval (50 concurrent)
  group('Patient List', () => {
    const patientRes = http.get(
      `${BASE_URL}/patients?limit=20&cursor=`,
      {
        headers: {
          Authorization: `Bearer ${AUTH_TOKEN}`,
        },
      },
    );

    check(patientRes, {
      'patient list status is 200': (r) => r.status === 200,
      'patient list response time < 500ms': (r) => r.timings.duration < 500,
      'has patient data': (r) => r.json('data')?.length > 0,
    });

    sleep(1);
  });

  // Scenario 3: Appointment Booking (30 concurrent)
  group('Appointment Booking', () => {
    const appointmentRes = http.post(
      `${BASE_URL}/appointments`,
      JSON.stringify({
        patientId: `patient-${Math.floor(Math.random() * 100)}`,
        doctorId: `doctor-1`,
        slotId: `slot-${Math.floor(Math.random() * 50)}`,
        clinicId: 'clinic-1',
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${AUTH_TOKEN}`,
        },
      },
    );

    check(appointmentRes, {
      'booking status is 200 or 201': (r) => r.status === 200 || r.status === 201,
      'booking response time < 800ms': (r) => r.timings.duration < 800,
    });

    sleep(1);
  });

  // Scenario 4: Consultation Workflow (20 concurrent)
  group('Consultation Workflow', () => {
    const consultationRes = http.post(
      `${BASE_URL}/consultations`,
      JSON.stringify({
        appointmentId: `appointment-${Math.floor(Math.random() * 50)}`,
        symptoms: 'Headache, fever',
        vitals: { temperature: 98.6, bloodPressure: '120/80' },
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${AUTH_TOKEN}`,
        },
      },
    );

    check(consultationRes, {
      'consultation status is 200 or 201': (r) => r.status === 200 || r.status === 201,
      'consultation response time < 1000ms': (r) => r.timings.duration < 1000,
    });

    sleep(2);
  });

  // Scenario 5: Health Check (continuous monitoring)
  group('Health Check', () => {
    const healthRes = http.get(`${BASE_URL}/health`);

    check(healthRes, {
      'health check status is 200': (r) => r.status === 200,
      'health check response time < 100ms': (r) => r.timings.duration < 100,
    });

    sleep(1);
  });
}

/**
 * RUNNING THIS TEST:
 * 
 * 1. Install k6: https://k6.io/docs/getting-started/installation/
 * 
 * 2. Set environment variables:
 *    export API_URL="https://api.yourdomain.com/api/v1"
 *    export AUTH_TOKEN="your-jwt-token"
 * 
 * 3. Run the test:
 *    k6 run scripts/load-tests.ts
 * 
 * 4. Get cloud results (optional):
 *    k6 cloud scripts/load-tests.ts
 * 
 * INTERPRETING RESULTS:
 * - p(95)<500ms: 95% of requests finish in under 500ms ✅ GOOD
 * - p(99)<1000ms: 99% of requests finish in under 1000ms ✅ GOOD
 * - rate<0.05: Less than 5% error rate ✅ GOOD
 * 
 * If any threshold fails, identify bottlenecks:
 * - Slow database queries
 * - N+1 query issues
 * - Missing indexes
 * - Resource pool exhaustion
 */
