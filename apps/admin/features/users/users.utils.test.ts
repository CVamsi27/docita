import { describe, expect, it } from "vitest";
import { calculateRoleStats, filterUsers, getRoleBadgeColor } from "./utils";
import type { User } from "./types";

const users: User[] = [
  {
    id: "1",
    name: "Dr. Ana",
    email: "ana@clinic.com",
    role: "DOCTOR",
    specialization: "CARDIOLOGY",
    createdAt: new Date("2024-01-01").toISOString(),
  },
  {
    id: "2",
    name: "Chris Admin",
    email: "admin@clinic.com",
    role: "ADMIN",
    createdAt: new Date("2024-01-02").toISOString(),
  },
  {
    id: "3",
    name: "Riya Desk",
    email: "riya@clinic.com",
    role: "RECEPTIONIST",
    createdAt: new Date("2024-01-03").toISOString(),
  },
];

describe("users utils", () => {
  it("calculates role stats", () => {
    const stats = calculateRoleStats(users);

    expect(stats.ALL).toBe(3);
    expect(stats.DOCTOR).toBe(1);
    expect(stats.ADMIN).toBe(1);
    expect(stats.RECEPTIONIST).toBe(1);
    expect(stats.ADMIN_DOCTOR).toBe(0);
  });

  it("filters users by search and role", () => {
    const cardiologyDoctors = filterUsers(users, "cardio", "DOCTOR");
    const admins = filterUsers(users, "", "ADMIN");

    expect(cardiologyDoctors).toHaveLength(1);
    expect(cardiologyDoctors[0]?.name).toBe("Dr. Ana");
    expect(admins).toHaveLength(1);
    expect(admins[0]?.email).toBe("admin@clinic.com");
  });

  it("returns consistent badge classes", () => {
    expect(getRoleBadgeColor("ADMIN")).toBe("tier-pro");
    expect(getRoleBadgeColor("DOCTOR")).toBe("tier-plus");
  });
});
