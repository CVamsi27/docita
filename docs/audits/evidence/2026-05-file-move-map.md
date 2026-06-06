# 2026-05 File Move Map

This map is generated in report mode. Do not move files until each row is reviewed and batched into a small PR.

| Current file | Type | Correct location | Action | Reason | Tests |
| --- | --- | --- | --- | --- | --- |
| apps/api/src/domains/appointments/presentation/controllers/appointments-schedule.controller.ts | controller | apps/api/src/domains/<domain>/presentation/controllers | split | controller is 268 lines; keep controllers thin | api lint; api tests; controller contract if route-facing |
| apps/api/src/domains/clinical/presentation/controllers/lab-tests.controller.ts | controller | apps/api/src/domains/<domain>/presentation/controllers | split | controller is 347 lines; keep controllers thin | api lint; api tests; controller contract if route-facing |
| apps/api/src/domains/enterprise-contracts/presentation/controllers/internal-enterprise-contracts.controller.ts | controller | apps/api/src/domains/<domain>/presentation/controllers | split | controller is 263 lines; keep controllers thin | api lint; api tests; controller contract if route-facing |
