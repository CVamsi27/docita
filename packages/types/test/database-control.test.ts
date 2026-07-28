import { describe, expect, it } from "vitest";
import {
  databaseControlActionSchema,
  databaseControlExecuteRequestSchema,
  databaseControlStateResponseSchema,
  rdsInstanceStatusSchema,
  rdsSnapshotSummarySchema,
} from "../src/admin/database-control";

describe("@workspace/types database-control", () => {
  describe("databaseControlActionSchema", () => {
    it("accepts the 5 valid actions", () => {
      for (const action of [
        "STOP",
        "START",
        "CREATE_SNAPSHOT",
        "DELETE",
        "RESTORE",
      ]) {
        expect(databaseControlActionSchema.parse(action)).toBe(action);
      }
    });

    it("rejects unknown actions", () => {
      expect(() => databaseControlActionSchema.parse("DROP")).toThrow();
    });
  });

  describe("rdsInstanceStatusSchema", () => {
    it("normalises known statuses", () => {
      for (const status of [
        "available",
        "stopped",
        "stopping",
        "starting",
        "creating",
        "deleting",
        "failed",
      ]) {
        expect(rdsInstanceStatusSchema.parse(status)).toBe(status);
      }
    });

    it("rejects garbage", () => {
      expect(() => rdsInstanceStatusSchema.parse("nope")).toThrow();
    });
  });

  describe("rdsSnapshotSummarySchema", () => {
    it("parses a minimal snapshot", () => {
      const parsed = rdsSnapshotSummarySchema.parse({
        identifier: "rds:docita-db-2026-07-27",
        isLatestForInstance: false,
      });
      expect(parsed.identifier).toBe("rds:docita-db-2026-07-27");
      expect(parsed.createdAt).toBeUndefined();
    });
  });

  describe("databaseControlExecuteRequestSchema", () => {
    it("accepts a STOP request with reason", () => {
      const parsed = databaseControlExecuteRequestSchema.parse({
        action: "STOP",
        reason: "no active users",
      });
      expect(parsed.action).toBe("STOP");
    });

    it("rejects reason shorter than 8 characters", () => {
      expect(() =>
        databaseControlExecuteRequestSchema.parse({
          action: "STOP",
          reason: "short",
        }),
      ).toThrow(/at least 8/);
    });

    it("accepts a RESTORE request with snapshotId", () => {
      const parsed = databaseControlExecuteRequestSchema.parse({
        action: "RESTORE",
        reason: "restoring from pre-stop snapshot",
        snapshotId: "rds:docita-db-final-2026-07-27",
      });
      expect(parsed.snapshotId).toBe("rds:docita-db-final-2026-07-27");
    });
  });

  describe("databaseControlStateResponseSchema", () => {
    it("accepts a disabled state", () => {
      const parsed = databaseControlStateResponseSchema.parse({
        enabled: false,
        environment: "production",
        environmentAllowed: false,
        instance: null,
        latestSnapshot: null,
        lastAction: null,
        cooldown: null,
      });
      expect(parsed.enabled).toBe(false);
    });

    it("accepts an enabled state with cooldown", () => {
      const parsed = databaseControlStateResponseSchema.parse({
        enabled: true,
        environment: "production",
        environmentAllowed: true,
        instance: {
          identifier: "docita-db",
          status: "available",
          multiAz: false,
          publiclyAccessible: false,
        },
        latestSnapshot: {
          identifier: "rds:docita-db-2026-07-27",
          isLatestForInstance: true,
        },
        lastAction: {
          id: "abc123",
          action: "STOP",
          status: "SUCCESS",
          actorEmail: "admin@docita.work",
          startedAt: "2026-07-27T10:00:00Z",
          completedAt: "2026-07-27T10:01:00Z",
          reason: "no active users",
        },
        cooldown: {
          action: "STOP",
          secondsRemaining: 42,
        },
      });
      expect(parsed.cooldown?.secondsRemaining).toBe(42);
    });
  });
});
