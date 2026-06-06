# 2026-05 Backend Structure Findings

| File | Severity | Finding | Suggested action |
| --- | --- | --- | --- |
| apps/api/src/domains/appointments/presentation/controllers/appointments-schedule.controller.ts | split | controller is 268 lines; keep controllers thin | split after characterization tests |
| apps/api/src/domains/clinical/presentation/controllers/lab-tests.controller.ts | split | controller is 347 lines; keep controllers thin | split after characterization tests |
| apps/api/src/domains/enterprise-contracts/presentation/controllers/internal-enterprise-contracts.controller.ts | split | controller is 263 lines; keep controllers thin | split after characterization tests |
