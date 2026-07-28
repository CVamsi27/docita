import { z } from "zod";

/**
 * Zod schemas for the internal portal "Database Control" feature.
 *
 * Action types are a closed set — adding a new action here is a
 * deliberate change because it adds a new destructive capability.
 */
export const databaseControlActionSchema = z.enum([
  "STOP",
  "START",
  "CREATE_SNAPSHOT",
  "DELETE",
  "RESTORE",
]);
export type DatabaseControlActionType = z.infer<
  typeof databaseControlActionSchema
>;

export const databaseControlStatusSchema = z.enum([
  "IN_PROGRESS",
  "SUCCESS",
  "FAILED",
]);
export type DatabaseControlStatus = z.infer<typeof databaseControlStatusSchema>;

export const rdsInstanceStatusSchema = z.enum([
  "available",
  "stopped",
  "stopping",
  "starting",
  "creating",
  "deleting",
  "failed",
  "incompatible-parameters",
  "incompatible-restore",
  "rebooting",
  "resetting-master-credentials",
  "storage-full",
  "storage-optimization",
  "unknown",
]);

export const rdsInstanceSummarySchema = z.object({
  identifier: z.string(),
  status: rdsInstanceStatusSchema,
  engine: z.string().optional(),
  engineVersion: z.string().optional(),
  allocatedStorageGb: z.number().optional(),
  instanceClass: z.string().optional(),
  endpoint: z.string().optional(),
  port: z.number().optional(),
  availabilityZone: z.string().optional(),
  multiAz: z.boolean(),
  publiclyAccessible: z.boolean(),
  lastStatusChangeAt: z.coerce.date().optional(),
});
export type RdsInstanceSummary = z.infer<typeof rdsInstanceSummarySchema>;

export const rdsSnapshotSummarySchema = z.object({
  identifier: z.string(),
  status: z.string().optional(),
  type: z.string().optional(),
  createdAt: z.coerce.date().optional(),
  allocatedStorageGb: z.number().optional(),
  engine: z.string().optional(),
  engineVersion: z.string().optional(),
  isLatestForInstance: z.boolean(),
});
export type RdsSnapshotSummary = z.infer<typeof rdsSnapshotSummarySchema>;

export const databaseControlLastActionSchema = z.object({
  id: z.string(),
  action: databaseControlActionSchema,
  status: databaseControlStatusSchema,
  actorEmail: z.string(),
  startedAt: z.coerce.date(),
  completedAt: z.coerce.date().nullable(),
  reason: z.string(),
});

export const databaseControlCooldownSchema = z.object({
  action: databaseControlActionSchema,
  secondsRemaining: z.number().int().nonnegative(),
});

export const databaseControlStateResponseSchema = z.object({
  enabled: z.boolean(),
  environment: z.string(),
  environmentAllowed: z.boolean(),
  instance: rdsInstanceSummarySchema.nullable(),
  latestSnapshot: rdsSnapshotSummarySchema.nullable(),
  lastAction: databaseControlLastActionSchema.nullable(),
  cooldown: databaseControlCooldownSchema.nullable(),
});
export type DatabaseControlState = z.infer<
  typeof databaseControlStateResponseSchema
>;

/**
 * The body of POST /internal/database-control/execute. Note that
 * `confirmation` and `snapshotId` are conditional but we model them as
 * optional + validate in the service to keep the wire schema flat.
 */
export const databaseControlExecuteRequestSchema = z.object({
  action: databaseControlActionSchema,
  reason: z.string().min(8, "Reason must be at least 8 characters."),
  confirmation: z.string().optional(),
  snapshotId: z.string().optional(),
});
export type DatabaseControlExecuteRequest = z.infer<
  typeof databaseControlExecuteRequestSchema
>;

export const databaseControlActionHistoryItemSchema = z.object({
  id: z.string(),
  action: databaseControlActionSchema,
  status: databaseControlStatusSchema,
  reason: z.string(),
  actorUserId: z.string(),
  actorEmail: z.string(),
  snapshotId: z.string().nullable(),
  awsRequestId: z.string().nullable(),
  errorMessage: z.string().nullable(),
  startedAt: z.coerce.date(),
  completedAt: z.coerce.date().nullable(),
});

export const databaseControlActionHistoryResponseSchema = z.object({
  items: z.array(databaseControlActionHistoryItemSchema),
});
export type DatabaseControlActionHistory = z.infer<
  typeof databaseControlActionHistoryResponseSchema
>;
