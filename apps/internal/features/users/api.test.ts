import { beforeEach, describe, expect, it, vi } from "vitest";

const { getMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
}));

vi.mock("@/lib/api-client", () => ({
  client: {
    get: getMock,
  },
}));

import { fetchClinicUsers } from "./api";

describe("users api", () => {
  beforeEach(() => {
    getMock.mockReset();
  });

  it("deduplicates users returned by clinic doctor and admin endpoints", async () => {
    getMock
      .mockResolvedValueOnce([
        { id: "1", name: "Ana", email: "ana@test.com", role: "DOCTOR" },
        { id: "2", name: "Ben", email: "ben@test.com", role: "ADMIN_DOCTOR" },
      ])
      .mockResolvedValueOnce([
        { id: "2", name: "Ben", email: "ben@test.com", role: "ADMIN_DOCTOR" },
        { id: "3", name: "Cara", email: "cara@test.com", role: "ADMIN" },
      ]);

    const users = await fetchClinicUsers("clinic-1");

    expect(users).toHaveLength(3);
    expect(users.map((user) => user.id)).toEqual(["1", "2", "3"]);
  });
});
