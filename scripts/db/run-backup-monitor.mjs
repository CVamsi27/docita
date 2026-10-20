#!/usr/bin/env node
import { createEnvironmentReader } from "./backup-environment.mjs";
import {
  BACKUP_READER_ENVIRONMENT,
  backupCheckInConfiguration,
  runBackupLifecycle,
} from "./backup-job-lifecycle.mjs";

class MonitorFailure extends Error {}
const { integer } = createEnvironmentReader(MonitorFailure);
const ALERT_ENVIRONMENT = [
  "BACKUP_MONITOR_ALERT_PROVIDER",
  "BACKUP_MONITOR_ALERT_WEBHOOK_URL",
  "BACKUP_MONITOR_EMAIL_API_URL",
  "BACKUP_MONITOR_EMAIL_TOKEN",
  "BACKUP_MONITOR_EMAIL_FROM",
  "BACKUP_MONITOR_ALERT_EMAIL_TO",
];

function configuration() {
  const checkOnly =
    process.argv.length === 3 && process.argv[2] === "--check-only";
  if (!checkOnly && process.argv.length !== 2)
    throw new MonitorFailure("unsupported arguments");
  const duration =
    integer("BACKUP_MONITOR_MAX_DURATION_SECONDS", 300, 600) * 1000;
  return {
    ...(checkOnly
      ? {}
      : backupCheckInConfiguration(
          "BACKUP_MONITOR_SENTRY_DSN",
          "BACKUP_MONITOR_SENTRY_SLUG",
          MonitorFailure,
        )),
    checkOnly,
    duration,
    monitorConfig: {
      schedule: { type: "crontab", value: "15 * * * *" },
      timezone: "Etc/UTC",
      checkin_margin: 10,
      max_runtime: 11,
      failure_issue_threshold: 1,
      recovery_threshold: 1,
    },
    environmentNames: [
      ...BACKUP_READER_ENVIRONMENT,
      ...(checkOnly ? [] : ALERT_ENVIRONMENT),
    ],
    script: new URL("./check-backup-freshness.mjs", import.meta.url),
    args: checkOnly ? ["--check-only"] : [],
    label: "reader",
    event: "backup_monitor_verified",
    Failure: MonitorFailure,
  };
}

Promise.resolve()
  .then(() => runBackupLifecycle(configuration()))
  .catch((error) => {
    const reason =
      error instanceof MonitorFailure ? error.message : "monitor failed safely";
    process.stderr.write(`Backup monitor failed: ${reason}.\n`);
    process.exitCode = 1;
  });
