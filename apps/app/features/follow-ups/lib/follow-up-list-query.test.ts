import { describe, expect, it } from "vitest";
import { getFollowUpListQuery } from "./follow-up-list-query";

describe("getFollowUpListQuery", () => {
  it("returns today window with pending statuses and limit", () => {
    const q = getFollowUpListQuery("today");
    expect(q.status).toBe("PENDING,REMINDER_SENT");
    expect(q.limit).toBe(100);
    expect(q.from).toBeDefined();
    expect(q.to).toBeDefined();
    expect(new Date(q.from!).getTime()).toBeLessThan(new Date(q.to!).getTime());
  });

  it("returns overdue window ending at start of today", () => {
    const q = getFollowUpListQuery("overdue");
    expect(q.status).toBe("PENDING,REMINDER_SENT");
    expect(q.from).toBeDefined();
    expect(q.to).toBeDefined();
  });
});
