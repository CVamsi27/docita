-- Add `database_control_actions` table for the internal portal's Database
-- Control feature (Stop/Start/Snapshot/Delete/Restore on the prod RDS).
-- See docs/architecture/DATABASE_CONTROL_PLAN.md.
--
-- The table lives in the same DB it controls, so after a Delete+Restore
-- the table will be empty until the next migration runs. This is
-- accepted: the operational copy of every action is also in the AWS
-- event log + CloudTrail + the `audit_logs` table, so no history is
-- actually lost across a DB lifecycle event.

-- CreateTable
CREATE TABLE "database_control_actions" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "actorEmail" TEXT NOT NULL,
    "snapshotId" TEXT,
    "awsRequestId" TEXT,
    "errorMessage" TEXT,
    "metadata" JSONB,
    "startedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMPTZ(3),

    CONSTRAINT "database_control_actions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "database_control_actions_startedAt_idx" ON "database_control_actions"("startedAt");

-- CreateIndex
CREATE INDEX "database_control_actions_action_startedAt_idx" ON "database_control_actions"("action", "startedAt");

-- CreateIndex
CREATE INDEX "database_control_actions_status_startedAt_idx" ON "database_control_actions"("status", "startedAt");
