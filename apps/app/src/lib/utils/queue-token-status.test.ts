import { describe, expect, it } from "vitest";
import {
  isQueueTokenCompleted,
  isQueueTokenInProgress,
  isQueueTokenWaiting,
  normalizeQueueTokenStatusKey,
} from "./queue-token-status";

describe("queue-token-status", () => {
  it("normalizes Prisma and kebab-case variants", () => {
    expect(normalizeQueueTokenStatusKey("IN_PROGRESS")).toBe("IN_PROGRESS");
    expect(normalizeQueueTokenStatusKey("in-progress")).toBe("IN_PROGRESS");
    expect(normalizeQueueTokenStatusKey("WAITING")).toBe("WAITING");
    expect(normalizeQueueTokenStatusKey("waiting")).toBe("WAITING");
  });

  it("detects waiting and in-progress", () => {
    expect(isQueueTokenWaiting("WAITING")).toBe(true);
    expect(isQueueTokenWaiting("waiting")).toBe(true);
    expect(isQueueTokenInProgress("IN_PROGRESS")).toBe(true);
    expect(isQueueTokenInProgress("in-progress")).toBe(true);
    expect(isQueueTokenWaiting("IN_PROGRESS")).toBe(false);
  });

  it("detects completed", () => {
    expect(isQueueTokenCompleted("COMPLETED")).toBe(true);
    expect(isQueueTokenCompleted("completed")).toBe(true);
    expect(isQueueTokenCompleted("WAITING")).toBe(false);
  });
});
