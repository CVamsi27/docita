-- Durable replay accounting prevents manual or future automated DLQ replay
-- from resetting the visible retry history indefinitely.
ALTER TABLE "QueueJob"
  ADD COLUMN "replayCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "lastReplayedAt" TIMESTAMP(3);
