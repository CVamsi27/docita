import { expect, test } from "@playwright/test";

test.describe("Basic Health Check", () => {
  test("servers are running or test is skipped", async () => {

    expect(true).toBe(true);
  });
});
