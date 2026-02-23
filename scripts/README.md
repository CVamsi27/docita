# Repository Scripts

This directory contains utility scripts for the Docita monorepo. All scripts are organized by purpose.

## Active Scripts (Maintained)

| Script               | Purpose                                                      | Usage                                |
| -------------------- | ------------------------------------------------------------ | ------------------------------------ |
| `check_env.js`       | Verify environment variables are set correctly               | `node scripts/check_env.js`          |
| `check-coverage.js`  | Display test coverage report                                 | `node scripts/check-coverage.js`     |
| `kill-ports.js`      | Kill processes using specific ports (useful for dev cleanup) | `node scripts/kill-ports.js`         |
| `analyze-indexes.ts` | Analyze database index performance and suggestions           | `ts-node scripts/analyze-indexes.ts` |
| `e2e-runner.js`      | Run end-to-end tests with reporting                          | `node scripts/e2e-runner.js`         |
| `run-tests.sh`       | Run all test suites across monorepo                          | `bash scripts/run-tests.sh`          |
| `run-test-report.sh` | Generate and display test coverage report                    | `bash scripts/run-test-report.sh`    |

## Infrastructure Scripts (AWS-specific)

| Script                      | Purpose                                              |
| --------------------------- | ---------------------------------------------------- |
| `ecr-lifecycle-policy.json` | AWS ECR lifecycle policy for container image cleanup |
| `iam-policy-update.json`    | IAM policy definitions for AWS permissions           |

## Moved/Deprecated Scripts

The following scripts have been moved to their appropriate project locations:

| Script                     | Previous Path | New Location             | Reason                                                |
| -------------------------- | ------------- | ------------------------ | ----------------------------------------------------- |
| `test-db-connection.js`    | `scripts/`    | `apps/api/test/scripts/` | DB connection test should be in API test directory    |
| `test-tenant-isolation.ts` | `scripts/`    | `apps/api/test/scripts/` | Tenant isolation test should be in API test directory |

## Deleted Scripts

The following one-off ad-hoc debugging scripts have been removed (were for development only):

- `test-query.js` - Ad-hoc database query test
- `test-smart-auth.js` - Ad-hoc authentication test
- `check-clinic-appointments.js` - Ad-hoc debugging script
- `test-medical-coding-api.sh` - Ad-hoc API test
- `embedded_med.ts` - Outdated medication schema definition
- `VERIFY_DYNAMIC_IMPORTS.sh` - One-off verification (already verified)
- `verify_backend.sh` - Ad-hoc backend verification
- `setup-ecr-lifecycle-policy.sh` - One-off infrastructure setup

## Adding New Scripts

When adding new scripts:

1. **Development scripts** → Keep in `scripts/` with proper documentation in this README
2. **API-specific tests** → Move to `apps/api/test/scripts/`
3. **Frontend-specific tests** → Move to `apps/app/test/scripts/`
4. **One-off debugging** → Don't commit; use local `.gitignore` to exclude
5. **Infrastructure setup** → Document in infrastructure as code (IaC) tool of choice

## Running Scripts

All scripts assume they're run from the repository root:

```bash
cd /path/to/docita
node scripts/check_env.js
```

For TypeScript scripts, install `ts-node` globally or use `pnpm exec`:

```bash
pnpm exec ts-node scripts/analyze-indexes.ts
```

## Maintenance

Last updated: 2026-02-14 (Session 2.25.2)

- Removed 8 ad-hoc debugging scripts
- Moved 2 useful test scripts to `apps/api/test/scripts/`
- Created this README to document kept scripts
