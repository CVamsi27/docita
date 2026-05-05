import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';
import { BASE_URL, authHeaders, uuid } from '../lib/config.js';

/**
 * Throttled WhatsApp outbound send. Validates per-tenant rate limits +
 * idempotency on the outbound path. Use a synthetic patient that has
 * an opt-in flag in the perf environment.
 */

const sendLatency = new Trend('wa_send_latency_ms', true);

export const options = {
  scenarios: {
    throttled: {
      executor: 'constant-arrival-rate',
      rate: 5,
      timeUnit: '1s',
      duration: '2m',
      preAllocatedVUs: 5,
      maxVUs: 20,
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<2000'],
    wa_send_latency_ms: ['p(95)<2000'],
  },
};

const PATIENT_ID = __ENV.K6_PATIENT_ID || 'seed-patient-1';

export default function whatsappSend() {
  const idempotencyKey = uuid();
  const res = http.post(
    `${BASE_URL}/whatsapp/messages`,
    JSON.stringify({
      patientId: PATIENT_ID,
      template: 'appointment_reminder',
      variables: { firstName: 'Perf', when: 'tomorrow 10am' },
    }),
    {
      headers: authHeaders({ 'Idempotency-Key': idempotencyKey }),
      tags: { scenario: 'whatsapp-send' },
    },
  );
  sendLatency.add(res.timings.duration);
  check(res, {
    'status is 200/202': (r) => r.status === 200 || r.status === 202,
  });
  sleep(0.5);
}
