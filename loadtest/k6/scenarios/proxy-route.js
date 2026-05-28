import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';

/**
 * Stresses the Cloudflare Worker → API proxy path for apps/app.
 *
 * Two configs are exposed to surface the difference between direct API
 * and proxy:
 *   - K6_BASE_URL           = e.g., https://app.docita.work (proxied)
 *   - K6_DIRECT_API_BASE    = e.g., https://api.docita.work/api/v1
 *
 * SYSTEM_DESIGN_AND_PATTERNS.md §28.6 item 46.
 */

const BASE_URL = __ENV.K6_BASE_URL || 'https://app.docita.work';
const DIRECT_API_BASE = __ENV.K6_DIRECT_API_BASE || '';

const proxyLatency = new Trend('proxy_route_latency_ms', true);
const directLatency = new Trend('direct_api_latency_ms', true);

export const options = {
  scenarios: {
    proxied: {
      executor: 'constant-arrival-rate',
      rate: 40,
      timeUnit: '1s',
      duration: '2m',
      preAllocatedVUs: 50,
      maxVUs: 200,
      exec: 'hitProxy',
    },
    direct: {
      executor: 'constant-arrival-rate',
      rate: 20,
      timeUnit: '1s',
      duration: '2m',
      preAllocatedVUs: 25,
      maxVUs: 100,
      exec: 'hitDirect',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    proxy_route_latency_ms: ['p(95)<1500'],
    direct_api_latency_ms: ['p(95)<800'],
  },
};

export function hitProxy() {
  const res = http.get(`${BASE_URL}/api/v1/health`, {
    tags: { scenario: 'proxy-route', path: 'proxy' },
  });
  proxyLatency.add(res.timings.duration);
  check(res, {
    'proxy returns 2xx': (r) => r.status >= 200 && r.status < 300,
  });
  sleep(0.1);
}

export function hitDirect() {
  if (!DIRECT_API_BASE) {
    return;
  }
  const res = http.get(`${DIRECT_API_BASE}/health`, {
    tags: { scenario: 'proxy-route', path: 'direct' },
  });
  directLatency.add(res.timings.duration);
  check(res, {
    'direct returns 2xx': (r) => r.status >= 200 && r.status < 300,
  });
  sleep(0.1);
}
