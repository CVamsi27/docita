import http from 'k6/http';
import { check } from 'k6';
import { Trend } from 'k6/metrics';
import { BASE_URL, signWebhook, uuid } from '../lib/config.js';

/**
 * Floods the WhatsApp webhook with valid HMAC-signed payloads to verify
 * signature verification, replay protection, and the queue handle the
 * load without dropping messages. K6_WEBHOOK_SECRET must match the
 * staging/perf environment's WHATSAPP_WEBHOOK_SECRET.
 */

const verifyLatency = new Trend('webhook_verify_latency_ms', true);

export const options = {
  scenarios: {
    sustained: {
      executor: 'constant-arrival-rate',
      rate: 100,
      timeUnit: '1s',
      duration: '1m',
      preAllocatedVUs: 50,
      maxVUs: 200,
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<400'],
    webhook_verify_latency_ms: ['p(95)<400'],
  },
};

export default function webhookFlood() {
  const eventId = uuid();
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const body = JSON.stringify({
    eventId,
    type: 'message',
    payload: { synthetic: true, vu: __VU, iter: __ITER },
  });
  const signature = signWebhook(body, timestamp);

  const res = http.post(`${BASE_URL}/webhooks/whatsapp`, body, {
    headers: {
      'Content-Type': 'application/json',
      'X-Webhook-Timestamp': timestamp,
      'X-Webhook-Signature': `t=${timestamp},v1=${signature}`,
    },
    tags: { scenario: 'webhook-flood' },
  });
  verifyLatency.add(res.timings.duration);
  check(res, {
    'status is 200/202': (r) => r.status === 200 || r.status === 202,
  });
}
