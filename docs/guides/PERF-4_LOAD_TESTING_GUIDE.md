# PERF-4: Load Testing - k6 Baseline Execution

## Status: Ready to Execute

### Quick Start

```bash
# 1. Start API (in separate terminal)
cd /Users/vamsikrishnachandaluri/repos/docita
pnpm --filter @docita/api dev

# 2. Run load test (in another terminal)
k6 run scripts/k6-baseline.js

# 3. Run with custom API URL
k6 run scripts/k6-baseline.js -e API_URL=http://localhost:3001/api/v1
```

### Test Configuration

**Profile:** Production-like load test (100 concurrent users over 5 minutes)

```
Stage 1: Ramp up 20 users (1 minute)
Stage 2: Ramp up 100 users (2 minutes)
Stage 3: Sustain 100 users (2 minutes)
Stage 4: Ramp down 0 users (1 minute)
Total Duration: ~6 minutes
```

### Success Thresholds

All thresholds must PASS for production readiness:

| Metric                | Threshold | Priority    | Status     |
| --------------------- | --------- | ----------- | ---------- |
| p(95) Response Time   | < 500ms   | 🔴 CRITICAL | ⏳ Pending |
| p(99) Response Time   | < 1000ms  | 🔴 CRITICAL | ⏳ Pending |
| p(99.9) Response Time | < 2000ms  | 🟡 HIGH     | ⏳ Pending |
| Error Rate            | < 5%      | 🔴 CRITICAL | ⏳ Pending |
| Connection Time p(95) | < 100ms   | 🟡 HIGH     | ⏳ Pending |

### Endpoints Being Tested

```
1. Health Check (GET /health)
   - Purpose: Baseline system health
   - Expected: 200 OK in <100ms

2. Home Page (GET http://localhost:3000)
   - Purpose: Frontend load performance
   - Expected: 200 OK in <1000ms

3. Patient List (GET /patients?page=1&limit=10)
   - Purpose: Without auth (will get 401)
   - Expected: <500ms response time

4. Appointments (GET /appointments?page=1&limit=10)
   - Purpose: List endpoint load
   - Expected: <500ms response time

5. Dashboard Stats (GET /dashboard/stats)
   - Purpose: Aggregation/computation load
   - Expected: <1000ms response time

6. Medical Coding Search (GET /medical-coding/icd-codes?search=diabetes)
   - Purpose: Full-text search performance
   - Expected: <500ms response time
```

### How to Interpret Results

**k6 outputs a summary after test completion:**

```
Summary Report Example:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  HTTP requests.......................: 12500 ok     ✓
  Response time ms.....................: avg=245, min=50, med=180, max=2500, p(95)=450, p(99)=890
  http_req_failed......................: rate=0.02 ✓ (Pass)
  http_req_duration....................: p(95)=450ms ✓ (PASS)
  http_req_connecting..................: p(95)=45ms ✓ (PASS)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Result: ✅ PASS
```

### Export Results

```bash
# Save results to JSON for analysis
k6 run -o json=load-test-results.json scripts/k6-baseline.js

# Save to CSV
k6 run --out csv=results.csv scripts/k6-baseline.js
```

### Common Issues & Solutions

**Issue:** `Connection refused: 127.0.0.1:3001`

- **Cause:** API not running
- **Fix:** `pnpm --filter @docita/api dev` in separate terminal

**Issue:** `context deadline exceeded` (timeouts)

- **Cause:** API too slow or database queries inefficient
- **Fix:** Check database query performance, add indexes, optimize endpoints

**Issue:** High error rate (>5%)

- **Cause:** Endpoint bugs or auth failures
- **Fix:** Check API logs, verify auth headers, debug failed requests

**Issue:** p(99) > 1000ms

- **Cause:** Some queries too slow or database locks
- **Fix:** Add caching, optimize N+1 queries, check connection pool

### Next Steps After Testing

1. **If PASS:** Document baseline and prepare for production deployment
2. **If FAIL:**
   - Identify slow endpoint (see logs)
   - Add database indexes if needed
   - Optimize queries or add caching
   - Retry test after optimization

### Integration with CI/CD

Once verified, add to pipeline:

```yaml
# .github/workflows/performance-test.yml
- name: Run Load Tests
   run: k6 run scripts/k6-baseline.js
  continue-on-error: true  # Allow builds to pass if performance test fails
```

### File Location

- **Script:** [scripts/k6-baseline.js](../../scripts/k6-baseline.js)
- **Config:** Inside script (no separate config file needed)
- **Results:** Generated in current directory as `results.json` if using `-o json=...`

---

**Status:** ✅ Ready for Team Execution  
**Owner:** Dev Team  
**Priority:** 🔴 CRITICAL (must complete before launch)  
**Effort:** 10-15 minutes to run + analyze results
