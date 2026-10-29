# Isolated 25-clinic capacity experiments

This runner models a month and samples four bounded GET routes on an explicitly isolated local API. It does not seed a database, start an API/worker, create customer adoption, exercise clinical writes or prove all-workflow capacity. A successful run means the declared read experiment completed, not that the product achieved its production SLOs.

## Prepare a local target

Use Node 24 and the pinned pnpm 10.30.3. Keep production stopped and use a disposable loopback PostgreSQL database. A local reverse proxy is not isolation: verify the API's actual database, storage and provider destinations before issuing requests. Apply the schema only to the disposable database and use synthetic data. Do not run the general E2E reset against an arbitrary configured URL.

1. Create25 synthetic clinics and25 distinct staff users in your isolated application, with the actual runtime role/RLS path enabled. Make one authorized read and a cross-tenant denial for each identity before load. The runner itself does not test those denial paths.
2. Obtain real local API access tokens for those staff users. Declared JWT claims are checked for shape, distinctclinic/user identities, staff role and expiry, but only the API verifies the signature and current membership. `test-helpers.mjs` produces invalid synthetic signatures for stub tests; those are not application credentials.
3. Create a private mode 0600 JSON credential file outside tracked source (or in an ignored/untracked directory). Use aliases `clinic-01` through `clinic-25`, each exactly once. Never publish it. The required shape is `{ "version": 1, "environment": "isolated-local", "tenants": [...] }`; each entry has exactly `alias`, `clinicId` and `bearerToken`. Keep tokens valid for the full phase and drain budget.
4. Select an appointment reference date containing the fixture's bookings. The default read mix is patient, appointment, prescription and invoice lists, page 1 / limit 20. Verify each actual route returns its expected 200 response and a bounded payload for the intended identity. The response bodies are discarded and never enter artifacts.
5. Verify provider mocks/sandboxes and no real external effects. These are GET routes, but the target's authorization, middleware and background scheduling remain its responsibility. Disable unrelated workers during a read-only API test, or explicitly inventory their effects.

The modeled month assumes25 clinics, 40 completed visits per clinic-day, 26 operating days, 1.3 visits per clinic-patient, prescriptions for 80% of visits, one invoice per visit, 20 API requests per visit and eight staff accounts per clinic. That derives26,000 appointments, 20,800 prescriptions, 26,000 invoices, 20,000 distinct clinic-patients, 520,000 appointment-linked requests and 200 staff accounts. The four-read mix approximates arrival pressure; it is not a replay of those clinical writes.

## Plan before issuing requests

```bash
pnpm capacity:plan
node loadtest/capacity.mjs --dry-run --phase busy --duration-seconds 180 \
  --reference-date 2026-10-28
pnpm test:capacity
```

Dry-run issues zero HTTP requests and reads no credentials. It returns the model, fixed routes, phase rates and explicit limits. Ordinary is about0.694 req/s, busy 3.333 req/s and artificial headroom 33.333 req/s. They are independent experiments, not counts to add into an ordinary business day. The default is all three 180-second phases. Maximum phase duration is900 seconds and request budget 20,000; use separate declared runs for larger sampling plans.

## Capture one declared experiment

```bash
node loadtest/capacity.mjs --confirm-isolated-local \
  --base-url http://127.0.0.1:3001 \
  --credentials /absolute/private/local-credentials.json \
  --output /absolute/private/new-capacity-result.json \
  --phase busy --duration-seconds 180 --reference-date 2026-10-28 \
  --temperature warm --max-in-flight 8 --timeout-ms 5000
```

`--confirm-isolated-local` records the operator's setup decision; it does not prove that the API connects to an isolated database. Only explicit-port literal 127.0.0.1 or [::1] origins are accepted. DNS hostnames, URL credentials, query/fragment and redirects are rejected. Native HTTP does not follow proxy environment variables or redirects. Credential files must be owned regular files with private permissions, not symlinks. Existing output files are not overwritten. Result files are created mode 0600; failed runs still retain observations when a capture completed.

Optional flags: `--phase ordinary|busy|headroom|all`, `--duration-seconds`, `--reference-date`, `--temperature warm|cold|unknown`, `--max-in-flight`, `--timeout-ms`, `--drain-timeout-ms`, `--max-lag-ms`, `--max-requests`, `--max-response-bytes`, and `--resources /absolute/private/resources.json`. Resource JSON permits only numeric `apiVcpus`, `apiMemoryMiB`, `apiReplicas`, `workerVcpus`, `workerMemoryMiB`, `workerReplicas`, `dbVcpus`, `dbMemoryMiB`, `dbStorageGiB`. Missing values remain unknown; declarations are never relabelled as observations. Invalid/unknown/repeated options fail.

The runner returns nonzero if any phase has failed, dropped, throttled, timed-out or unfinished work, or lacks a successful tenant/route pair. All 25 tenants and all four routes must have a successful sample in each phase for `complete`. That coverage condition still does not verify response content or cross-tenant isolation.

## Interpret the artifact

Artifacts retain the revision, dirty-source indication, tracked diff hash, harness hash, machine declarations, arrival schedule, per-route/per-tenant alias summaries and raw timing/outcome rows. No token, actual clinic/user identity, response body, request header or credential file path is retained. The CLI prints a result SHA256; keep the actual source snapshot as well as its hash, especially for untracked application changes.

Arrivals are open-loop: response speed does not lower the planned offered rate. Late arrivals and in-flight saturation are reported as client drops rather than silently retried in a catch-up burst. Capture outstanding requests at arrival-end and drain deadline. Response bodies are drained without retention under a byte limit. HTTP failures, redirects,429s, network errors, timeouts and cancellations are separate outcomes. Successful latency covers dispatch through response-body completion; error-attempt durations have their own population. Percentiles use nearest rank and include sample counts; unavailable populations return null.

Do not average percentiles across replicas or phases. Retain warm/cold runs separately. Predeclare per-route sample counts (for example 1,000 or 10,000) appropriate to tail analysis; those are planning minima, not statistical confidence guarantees. The current three-minute ordinary phase is a smoke experiment with roughly 125 requests, not strong P99 evidence.

Collect API/worker RSS, heap, event-loop lag, CPU quota/throttling, actual DB pool waits/locks/I/O, database/relation bytes and queue age/completion alongside the HTTPartifact. This runner does not collect those server-side observations. It never claims that native developer-machine results establish512 MiB Fly shared-CPU performance.

## SQL correctness at the modeled row volume

[The dedicated SQL fixture suite](../apps/api/test/metrics/README.md) executes the real operational aggregate over synthetic projected tables, including25 clinics, 26,000 appointments, 20,800 prescriptions, 26,000 invoices and 520,000 request rows. It proves the aggregate's declared counts on that fixture. It does not exercise the full Prisma schema, API authorization, RLSroles, route workload, providers or production latency.

A full capacity verdict additionally needs representative history/indexes and queryplans, real tenant authorization, booking/payment contention, job/PDF effects, restart/replay, recovery and observed resource limits. Missing evidence remains a gap; never fill a baseline with target values or stub timings.
