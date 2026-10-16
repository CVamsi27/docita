#!/usr/bin/env node
import { createEnvironmentReader } from "./backup-environment.mjs";
import {
  BACKUP_READER_ENVIRONMENT,
  BACKUP_WRITER_ENVIRONMENT,
  backupCheckInConfiguration,
  runBackupLifecycle,
} from "./backup-job-lifecycle.mjs";

class CycleFailure extends Error {}
const { integer, required } = createEnvironmentReader(CycleFailure);

function configuration() {
  // This command performs a dump. It deliberately has no diagnostic argument.
  if (process.argv.length !== 2)
    throw new CycleFailure("unsupported arguments");
  for (const [writer, reader] of [
    ["BACKUP_S3_ENDPOINT", "BACKUP_MONITOR_S3_ENDPOINT"],
    ["BACKUP_BUCKET", "BACKUP_MONITOR_BUCKET"],
    ["BACKUP_AGE_RECIPIENT", "BACKUP_MONITOR_AGE_RECIPIENT"],
  ]) {
    if (required(writer) !== required(reader))
      throw new CycleFailure("writer and reader backup identity differs");
  }
  if (required("BACKUP_SOURCE_ID") !== "docita-production")
    throw new CycleFailure("reader requires the production backup source");
  if (
    required("BACKUP_ACCESS_KEY_ID") ===
    required("BACKUP_MONITOR_ACCESS_KEY_ID")
  )
    throw new CycleFailure("reader requires a separate storage credential");
  const writerSeconds = integer("BACKUP_MAX_DURATION_SECONDS", 1200, 7200);
  const readerSeconds = integer(
    "BACKUP_MONITOR_MAX_DURATION_SECONDS",
    300,
    600,
  );
  return {
    ...backupCheckInConfiguration(
      "BACKUP_CYCLE_SENTRY_DSN",
      "BACKUP_CYCLE_SENTRY_SLUG",
      CycleFailure,
    ),
    monitorConfig: {
      schedule: { type: "interval", value: 1, unit: "hour" },
      timezone: "Etc/UTC",
      checkin_margin: 15,
      max_runtime: Math.ceil((writerSeconds + readerSeconds + 36) / 60),
      failure_issue_threshold: 1,
      recovery_threshold: 1,
    },
    steps: [
      {
        script: new URL("./backup-database.mjs", import.meta.url),
        args: [],
        environmentNames: BACKUP_WRITER_ENVIRONMENT,
        duration: writerSeconds * 1000,
        label: "writer",
      },
      {
        script: new URL("./check-backup-freshness.mjs", import.meta.url),
        args: ["--check-only"],
        environmentNames: BACKUP_READER_ENVIRONMENT,
        duration: readerSeconds * 1000,
        label: "reader",
      },
    ],
    event: "backup_cycle_verified",
    Failure: CycleFailure,
  };
}

Promise.resolve()
  .then(() => runBackupLifecycle(configuration()))
  .catch((error) => {
    const reason =
      error instanceof CycleFailure ? error.message : "cycle failed safely";
    process.stderr.write(`Backup cycle failed: ${reason}.\n`);
    process.exitCode = 1;
  });
