import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { ForbiddenException, ServiceUnavailableException } from "@nestjs/common";
import { DatabaseControlService, DELETE_CONFIRMATION_PHRASE } from "./database-control.service";
import type { DatabaseControlConfigService } from "../config/database-control-config.service";
import type { EnvironmentConfigService } from "../config/environment-config.service";
import type { AuditLoggerService } from "../audit/audit-logger.service";
import type { EmailService } from "../messaging/email/email.service";
import type {
  DatabaseRdsService,
  RdsInstanceSummary,
} from "../database/database-rds.service";
import type {
  DatabaseControlStateRepository,
  DatabaseControlActionType,
} from "../database/database-control-state.repository";
import type { IClock } from "@/shared/common/ports/clock.port";
import { Role } from "@workspace/db";

const FIXED_NOW = new Date("2026-07-27T12:00:00Z");

function makeRdsSummary(
  status: "available" | "stopped" | "starting" | "stopping" = "available",
): RdsInstanceSummary {
  return {
    identifier: "docita-db",
    status,
    engine: "postgres",
    engineVersion: "15.4",
    allocatedStorageGb: 20,
    instanceClass: "db.t4g.micro",
    endpoint: "docita-db.x.rds.amazonaws.com",
    port: 5432,
    availabilityZone: "ap-south-1a",
    multiAz: false,
    publiclyAccessible: false,
    lastStatusChangeAt: new Date("2026-07-27T00:00:00Z"),
  };
}

function makeCtx() {
  const config = {
    isEnabled: jest.fn<() => boolean>().mockReturnValue(true),
    isCurrentEnvironmentAllowed: jest
      .fn<() => boolean>()
      .mockReturnValue(true),
    getCooldownSeconds: jest.fn<() => number>().mockReturnValue(0),
    getAlertEmail: jest.fn<() => string | undefined>().mockReturnValue("admin@docita.work"),
  } as unknown as DatabaseControlConfigService;
  const environment = {
    getEnvironment: jest.fn<() => string>().mockReturnValue("production"),
  } as unknown as EnvironmentConfigService;
  const rds = {
    getInstanceId: jest.fn<() => string>().mockReturnValue("docita-db"),
    getRegion: jest.fn<() => string>().mockReturnValue("ap-south-1"),
    buildSnapshotId: jest
      .fn<(kind: "manual" | "final") => string>()
      .mockImplementation((kind) => `docita-db-${kind}-test`),
    requestCreateSnapshot: jest
      .fn<() => Promise<{ requestId: string | undefined }>>()
      .mockResolvedValue({ requestId: "aws-req-1" }),
    requestStop: jest
      .fn<() => Promise<{ requestId: string | undefined }>>()
      .mockResolvedValue({ requestId: "aws-req-2" }),
    requestStart: jest
      .fn<() => Promise<{ requestId: string | undefined }>>()
      .mockResolvedValue({ requestId: "aws-req-3" }),
    requestDeleteWithFinalSnapshot: jest
      .fn<() => Promise<{ requestId: string | undefined }>>()
      .mockResolvedValue({ requestId: "aws-req-4" }),
    requestRestoreFromSnapshot: jest
      .fn<() => Promise<{ requestId: string | undefined }>>()
      .mockResolvedValue({ requestId: "aws-req-5" }),
    waitForStopped: jest
      .fn<() => Promise<RdsInstanceSummary>>()
      .mockResolvedValue(makeRdsSummary("stopped")),
    waitForAvailable: jest
      .fn<() => Promise<RdsInstanceSummary>>()
      .mockResolvedValue(makeRdsSummary("available")),
    waitForInstanceDeleted: jest.fn<() => Promise<void>>().mockResolvedValue(),
    describeInstance: jest
      .fn<() => Promise<RdsInstanceSummary>>()
      .mockResolvedValue(makeRdsSummary("available")),
    listRecentSnapshots: jest
      .fn<() => Promise<unknown[]>>()
      .mockResolvedValue([]),
  } as unknown as DatabaseRdsService;
  const state = {
    recordStart: jest
      .fn<() => Promise<string>>()
      .mockResolvedValue("action-id-1"),
    recordCompletion: jest.fn<() => Promise<void>>().mockResolvedValue(),
    findLastActionTimestamp: jest
      .fn<() => Promise<Date | null>>()
      .mockResolvedValue(null),
    findLastSuccessAction: jest
      .fn<() => Promise<unknown>>()
      .mockResolvedValue(null),
    findRecentHistory: jest.fn<() => Promise<unknown[]>>().mockResolvedValue([]),
  } as unknown as DatabaseControlStateRepository;
  const audit = {
    log: jest.fn<() => Promise<void>>().mockResolvedValue(),
  } as unknown as AuditLoggerService;
  const email = {
    send: jest.fn<() => Promise<void>>().mockResolvedValue(),
  } as unknown as EmailService;
  const clock = {
    now: jest.fn<() => Date>().mockReturnValue(FIXED_NOW),
  } as unknown as IClock;

  return {
    service: new DatabaseControlService(
      config,
      environment,
      rds,
      state,
      audit,
      email,
      clock,
    ),
    config,
    environment,
    rds,
    state,
    audit,
    email,
    clock,
  };
}

const ADMIN_USER = {
  id: "user-1",
  email: "admin@docita.work",
  role: Role.INTERNAL,
};

describe("DatabaseControlService.execute", () => {
  let ctx: ReturnType<typeof makeCtx>;
  beforeEach(() => {
    ctx = makeCtx();
  });

  it("rejects when feature is disabled", async () => {
    (ctx.config.isEnabled as jest.Mock).mockReturnValue(false);
    await expect(
      ctx.service.execute(
        { action: "STOP", reason: "no active users" },
        ADMIN_USER,
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it("rejects when current environment is not allowed", async () => {
    (ctx.config.isCurrentEnvironmentAllowed as jest.Mock).mockReturnValue(false);
    await expect(
      ctx.service.execute(
        { action: "STOP", reason: "no active users" },
        ADMIN_USER,
      ),
    ).rejects.toThrow(/not allowed in NODE_ENV/);
  });

  it("rejects when reason is too short", async () => {
    await expect(
      ctx.service.execute({ action: "STOP", reason: "short" }, ADMIN_USER),
    ).rejects.toThrow(/at least 8 characters/);
  });

  it("rejects DELETE without the confirmation phrase", async () => {
    await expect(
      ctx.service.execute(
        {
          action: "DELETE",
          reason: "removing the DB to save cost",
          confirmation: "wrong",
        },
        ADMIN_USER,
      ),
    ).rejects.toThrow(DELETE_CONFIRMATION_PHRASE);
  });

  it("rejects RESTORE without a snapshotId", async () => {
    await expect(
      ctx.service.execute(
        { action: "RESTORE", reason: "restoring from pre-stop snapshot" },
        ADMIN_USER,
      ),
    ).rejects.toThrow(/RESTORE requires a snapshotId/);
  });

  it("executes STOP, records success, audits, and notifies", async () => {
    const result = await ctx.service.execute(
      { action: "STOP", reason: "no active users, saving cost" },
      ADMIN_USER,
    );
    expect(result.actionId).toBe("action-id-1");
    expect(ctx.rds.requestStop).toHaveBeenCalledTimes(1);
    expect(ctx.state.recordStart).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "STOP",
        actorEmail: "admin@docita.work",
        reason: "no active users, saving cost",
      }),
    );
    expect(ctx.state.recordCompletion).toHaveBeenCalledWith(
      "action-id-1",
      expect.objectContaining({ status: "SUCCESS" }),
    );
    expect(ctx.audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "SYSTEM_SETTING_CHANGED",
        status: "success",
        resourceId: "docita-db",
      }),
    );
    expect(ctx.email.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "admin@docita.work",
        subject: expect.stringMatching(/\[SUCCESS\] Database Control: STOP/),
      }),
    );
  });

  it("executes CREATE_SNAPSHOT and passes the generated snapshotId back", async () => {
    const result = await ctx.service.execute(
      { action: "CREATE_SNAPSHOT", reason: "safety snapshot before stop" },
      ADMIN_USER,
    );
    expect(result.actionId).toBe("action-id-1");
    expect(ctx.rds.buildSnapshotId).toHaveBeenCalledWith("manual");
    expect(ctx.rds.requestCreateSnapshot).toHaveBeenCalledWith(
      "docita-db-manual-test",
    );
  });

  it("executes DELETE with the correct confirmation and final snapshot", async () => {
    await ctx.service.execute(
      {
        action: "DELETE",
        reason: "removing the DB to save cost",
        confirmation: DELETE_CONFIRMATION_PHRASE,
      },
      ADMIN_USER,
    );
    expect(ctx.rds.buildSnapshotId).toHaveBeenCalledWith("final");
    expect(ctx.rds.requestDeleteWithFinalSnapshot).toHaveBeenCalledWith(
      "docita-db-final-test",
    );
  });

  it("executes RESTORE with the provided snapshotId", async () => {
    await ctx.service.execute(
      {
        action: "RESTORE",
        reason: "restoring from pre-stop snapshot",
        snapshotId: "docita-db-final-2026-07-27T12-00-00Z",
      },
      ADMIN_USER,
    );
    expect(ctx.rds.requestRestoreFromSnapshot).toHaveBeenCalledWith(
      "docita-db-final-2026-07-27T12-00-00Z",
    );
  });

  it("records FAILED and rethrows when the AWS call throws", async () => {
    (ctx.rds.requestStop as jest.Mock).mockImplementationOnce(() =>
      Promise.reject(new Error("RDS throttle")),
    );
    await expect(
      ctx.service.execute(
        { action: "STOP", reason: "no active users, saving cost" },
        ADMIN_USER,
      ),
    ).rejects.toThrow(ServiceUnavailableException);
    expect(ctx.state.recordCompletion).toHaveBeenCalledWith(
      "action-id-1",
      expect.objectContaining({
        status: "FAILED",
        errorMessage: expect.stringContaining("RDS throttle"),
      }),
    );
    expect(ctx.audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ status: "failure" }),
    );
  });
});

describe("DatabaseControlService cooldown", () => {
  let ctx: ReturnType<typeof makeCtx>;
  beforeEach(() => {
    ctx = makeCtx();
    (ctx.config.getCooldownSeconds as jest.Mock).mockReturnValue(60);
  });

  it("blocks a STOP that is within the cooldown window", async () => {
    const recent = new Date(FIXED_NOW.getTime() - 30_000); // 30s ago
    (ctx.state.findLastActionTimestamp as jest.Mock).mockImplementation(
      () => Promise.resolve(recent),
    );
    await expect(
      ctx.service.execute(
        { action: "STOP", reason: "trying again too soon" },
        ADMIN_USER,
      ),
    ).rejects.toThrow(/Cooldown active/);
    expect(ctx.rds.requestStop).not.toHaveBeenCalled();
  });

  it("allows START regardless of cooldown", async () => {
    const recent = new Date(FIXED_NOW.getTime() - 1000); // 1s ago
    (ctx.state.findLastActionTimestamp as jest.Mock).mockImplementation(
      () => Promise.resolve(recent),
    );
    await ctx.service.execute(
      { action: "START", reason: "bringing it back online" },
      ADMIN_USER,
    );
    expect(ctx.rds.requestStart).toHaveBeenCalled();
  });
});
