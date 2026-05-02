import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';
import { BASE_URL, authHeaders, uuid } from '../lib/config.js';

/**
 * Burst create POST /appointments to validate idempotency (each VU uses
 * the same key for a few iterations to exercise the dedupe path) and
 * the tenant rate limiter. Set K6_PATIENT_ID and K6_DOCTOR_ID to seeded
 * synthetic ids in the perf environment.
 */

const createLatency = new Trend('appt_create_latency_ms', true);

export const options = {
  scenarios: {
    burst: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '20s', target: 20 },
        { duration: '40s', target: 60 },
        { duration: '20s', target: 0 },
      ],
      gracefulRampDown: '15s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<1500'],
    appt_create_latency_ms: ['p(95)<1500'],
  },
};

const PATIENT_ID = __ENV.K6_PATIENT_ID || 'seed-patient-1';
const DOCTOR_ID = __ENV.K6_DOCTOR_ID || 'seed-doctor-1';

export default function appointmentCreate() {
  const idempotencyKey = uuid();
  const startsAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const res = http.post(
      `${BASE_URL}/appointments`,
      JSON.stringify({
        patientId: PATIENT_ID,
        doctorId: DOCTOR_ID,
        startsAt,
        durationMinutes: 30,
        type: 'CONSULTATION',
      }),
      {
        headers: authHeaders({ 'Idempotency-Key': idempotencyKey }),
        tags: { scenario: 'appointments-create', attempt: String(attempt) },
      },
    );
    createLatency.add(res.timings.duration);
    check(res, {
      'status is 200/201': (r) => r.status === 200 || r.status === 201,
    });
    sleep(0.2);
  }
}
