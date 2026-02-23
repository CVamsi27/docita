# k6 Performance Testing Guide

## Overview

This guide covers running k6 load tests for Docita's critical endpoints.

## Installation

k6 is already installed via Homebrew:

```bash
brew install k6
```

Verify installation:

```bash
k6 version
```

## Running the Baseline Test

### Prerequisites

1. Ensure the API is running:

```bash
pnpm --filter @docita/api dev
```

2. (Optional) Set admin token if needed:

```bash
export ADMIN_TOKEN="your-test-token"
```

### Running Baseline Metrics

```bash
k6 run scripts/k6-baseline.js
```

This will:

- Warm up with 10 virtual users for 30 seconds
- Scale to 25 users for 2 minutes (normal load test)
- Spike to 50 users for 30 seconds (stress test)
- Cool down to 0 users over 30 seconds
- **Total duration:** ~4 minutes

### Understanding the Output

**Key Metrics:**

- **http_req_duration**: Response time (p95 < 500ms threshold, p99 < 1000ms)
- **http_req_failed**: Failed request rate (< 10% threshold)
- **http_reqs**: Total requests made
- **checks**: HTTP check results (assertions)

### Sample Output

```
✓ health status is 200
✓ list patients status is 200
✓ response time < 500ms
✓ get patient status is 2xx or 4xx

     checks.....................: 95.0% ✓ 1425  ✗ 75
     data_sent....................: 142.5 kB
     data_received................: 15.2 MB
     http_req_blocked.............: avg=2.5ms   min=1ms     max=98ms    p(90)=3ms    p(95)=5ms
     http_req_connecting..........: avg=0.8ms   min=0ms     max=45ms    p(90)=1ms    p(95)=2ms
     http_req_duration............: avg=187.3ms min=31ms    max=892ms   p(90)=312ms  p(95)=425ms
     http_req_failed.............: 0.07%  ✓ 1 ✗ 1425
     http_req_receiving..........: avg=2.3ms   min=0ms     max=78ms    p(90)=3ms    p(95)=5ms
     http_req_sending............: avg=1.2ms   min=0ms     max=45ms    p(90)=1ms    p(95)=2ms
     http_req_tls_handshaking....: avg=0.3ms   min=0ms     max=25ms    p(90)=0ms    p(95)=0ms
     http_req_waiting............: avg=183.8ms min=28ms    max=887ms   p(90)=308ms  p(95)=420ms
     http_reqs....................: 1426   143/s
     iteration_duration..........: avg=11.2s   min=10s     max=12.5s   p(90)=11.3s  p(95)=11.8s
     iterations..................: 143    14.3/s
     vus_max......................: 50
```

## Advanced: Custom Performance Tests

Create endpoint-specific test:

```bash
k6 run scripts/k6-payments.js  # For payment processing tests
k6 run scripts/k6-imports.js   # For bulk import tests
```

## Continuous Integration

In CI/production, run tests with JSON output:

```bash
k6 run \
  --out json=results.json \
  --summary-export=summary.json \
  scripts/k6-baseline.js
```

Parse results:

```bash
cat summary.json | jq '.metrics'
```

## Interpreting Results

**Green Lights (Good Performance):**

- p(95) response time < 500ms
- p(99) response time < 1000ms
- http_req_failed < 10%
- checks pass rate > 90%

**Red Lights (Performance Issues):**

- p(95) response time > 1000ms
- p(99) response time > 2000ms
- http_req_failed > 5%
- checks pass rate < 80%

## Tips

1. **Run tests during off-peak times** to avoid production interference
2. **Scale gradually** - don't jump from 0 to 1000 users instantly
3. **Monitor database connections** - k6 can exhaust connection pools
4. **Use realistic data** - test with production-like payloads
5. **Run multiple times** - performance varies, check consistency

## Troubleshooting

**Error: "Connection refused"**

- Ensure API is running on port 3333
- Check firewall/network settings

**Error: "Too many open files"**

- Increase system limits: `ulimit -n 10000`

**High response times at the start**

- Normal - this is the warm-up phase
- Focus on steady-state metrics (2-4 minute mark)

## Next Steps

- Set up CI/CD integration to run tests on each deployment
- Create performance regression alerts
- Monitor production with real-time k6 cloud (optional)
