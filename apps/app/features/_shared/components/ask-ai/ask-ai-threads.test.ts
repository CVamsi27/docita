import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  deriveTitle,
  isToday,
  loadThreads,
  saveThreads,
  upsertThread,
  type AskAiStoredThread,
} from "./ask-ai-threads";

const baseThread: AskAiStoredThread = {
  id: "t-1",
  title: "Original",
  scopeLabel: null,
  createdAt: 1,
  updatedAt: 1,
  messages: [
    { id: "m-1", author: "user", content: "hello", createdAt: 1 },
  ],
};

describe("ask-ai-threads", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });
  afterEach(() => {
    window.localStorage.clear();
  });

  it("round-trips threads through localStorage", () => {
    saveThreads([baseThread]);
    expect(loadThreads()).toEqual([baseThread]);
  });

  it("ignores malformed entries on load", () => {
    window.localStorage.setItem(
      "docita.ask-ai.threads.v1",
      JSON.stringify([baseThread, { id: 1 }, null]),
    );
    expect(loadThreads()).toEqual([baseThread]);
  });

  it("upserts by id without duplicating", () => {
    const next = { ...baseThread, title: "Updated", updatedAt: 2 };
    const merged = upsertThread([baseThread], next);
    expect(merged).toHaveLength(1);
    expect(merged[0]?.title).toBe("Updated");
  });

  it("prepends a new thread when id is unknown", () => {
    const other = { ...baseThread, id: "t-2", title: "Other" };
    const merged = upsertThread([baseThread], other);
    expect(merged.map((t) => t.id)).toEqual(["t-2", "t-1"]);
  });

  it("isToday compares calendar day, not 24-hour window", () => {
    const now = new Date("2026-05-14T08:00:00").getTime();
    const earlierToday = new Date("2026-05-14T00:30:00").getTime();
    const yesterday = new Date("2026-05-13T23:30:00").getTime();
    expect(isToday(earlierToday, now)).toBe(true);
    expect(isToday(yesterday, now)).toBe(false);
  });

  it("deriveTitle truncates long prompts and falls back when empty", () => {
    expect(deriveTitle("")).toBe("New thread");
    expect(deriveTitle("short prompt")).toBe("short prompt");
    const long = "a".repeat(80);
    const title = deriveTitle(long);
    expect(title.endsWith("…")).toBe(true);
    expect(title.length).toBeLessThanOrEqual(60);
  });
});
