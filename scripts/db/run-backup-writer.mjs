#!/usr/bin/env node
import { createEnvironmentReader } from "./backup-environment.mjs";
import {
  BACKUP_WRITER_ENVIRONMENT,
  backupCheckInConfiguration,
  runBackupLifecycle,
} from "./backup-job-lifecycle.mjs";

class WriterFailure extends Error {}
const { integer } = createEnvironmentReader(WriterFailure);

function configuration() {
  if (process.argv.length !== 2)
    throw new WriterFailure("unsupported arguments");
  const seconds = integer("BACKUP_MAX_DURATION_SECONDS", 1200, 7200);
  return {
    ...backupCheckInConfiguration(
      "BACKUP_SENTRY_DSN",
      "BACKUP_SENTRY_SLUG",
      WriterFailure,
    ),
    duration: seconds * 1000,
    monitorConfig: {
      schedule: { type: "interval", value: 1, unit: "hour" },
      timezone: "Etc/UTC",
      checkin_margin: 15,
      max_runtime: Math.ceil((seconds + 18) / 60),
      failure_issue_threshold: 1,
      recovery_threshold: 1,
    },
    environmentNames: BACKUP_WRITER_ENVIRONMENT,
    script: new URL("./backup-database.mjs", import.meta.url),
    args: [],
    label: "writer",
    event: "backup_writer_verified",
    Failure: WriterFailure,
  };
}

Promise.resolve()
  .then(() => runBackupLifecycle(configuration()))
  .catch((error) => {
    const reason =
      error instanceof WriterFailure ? error.message : "writer failed safely";
    process.stderr.write(`Backup writer failed: ${reason}.\n`);
    process.exitCode = 1;
  });
