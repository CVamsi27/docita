import { describe, expect, it } from "vitest";
import type { User } from "@workspace/types";
import {
  buildCreateMemberPayload,
  buildUpdateMemberPayload,
  computeCanChangeSelectedMemberRole,
  computeIsSelectedMemberDoctor,
  computeMemberDialogDescription,
  computeUserCanChangeRoles,
  getEmptyMemberFormDefaultValues,
  getInviteFormDefaultValues,
  getMemberFormDefaultValues,
  sortMembersByName,
} from "./member-management-logic";

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: "u-1",
    name: "Dr. Asha",
    email: "asha@example.com",
    role: "DOCTOR",
    clinicId: "c-1",
    ...overrides,
  } as User;
}

describe("member-management-logic", () => {
  describe("sortMembersByName", () => {
    it("sorts case-insensitively by display name", () => {
      const sorted = sortMembersByName([
        makeUser({ id: "u-1", name: "bob" }),
        makeUser({ id: "u-2", name: "Alice" }),
        makeUser({ id: "u-3", name: "charlie" }),
      ]);
      expect(sorted.map((u) => u.name)).toEqual(["Alice", "bob", "charlie"]);
    });

    it("does not mutate the input array", () => {
      const input = [makeUser({ name: "b" }), makeUser({ name: "a" })];
      const snapshot = [...input];
      sortMembersByName(input);
      expect(input).toEqual(snapshot);
    });
  });

  describe("computeUserCanChangeRoles", () => {
    it("is true for ADMIN", () => {
      expect(computeUserCanChangeRoles("ADMIN")).toBe(true);
    });
    it("is true for ADMIN_DOCTOR", () => {
      expect(computeUserCanChangeRoles("ADMIN_DOCTOR")).toBe(true);
    });
    it("is false for DOCTOR", () => {
      expect(computeUserCanChangeRoles("DOCTOR")).toBe(false);
    });
    it("is false for NURSE", () => {
      expect(computeUserCanChangeRoles("NURSE")).toBe(false);
    });
    it("is false for undefined", () => {
      expect(computeUserCanChangeRoles(undefined)).toBe(false);
    });
  });

  describe("computeIsSelectedMemberDoctor", () => {
    it("recognises DOCTOR", () => {
      expect(computeIsSelectedMemberDoctor("DOCTOR")).toBe(true);
    });
    it("recognises ADMIN_DOCTOR", () => {
      expect(computeIsSelectedMemberDoctor("ADMIN_DOCTOR")).toBe(true);
    });
    it("rejects NURSE", () => {
      expect(computeIsSelectedMemberDoctor("NURSE")).toBe(false);
    });
  });

  describe("computeCanChangeSelectedMemberRole", () => {
    it("is false when no member is selected", () => {
      expect(
        computeCanChangeSelectedMemberRole({
          selectedMember: null,
          userCanChangeRoles: true,
          currentUserId: "admin-1",
        }),
      ).toBe(false);
    });
    it("is false when the user lacks role-change permission", () => {
      expect(
        computeCanChangeSelectedMemberRole({
          selectedMember: makeUser(),
          userCanChangeRoles: false,
          currentUserId: "nurse-1",
        }),
      ).toBe(false);
    });
    it("is false when editing self (self-demotion guard)", () => {
      const self = makeUser({ id: "admin-1" });
      expect(
        computeCanChangeSelectedMemberRole({
          selectedMember: self,
          userCanChangeRoles: true,
          currentUserId: "admin-1",
        }),
      ).toBe(false);
    });
    it("is true for a non-self admin-role member under an admin", () => {
      // ADMIN_SWITCH_ROLES = {ADMIN, ADMIN_DOCTOR}; a NURSE / DOCTOR
      // would be guarded out (see next test).
      expect(
        computeCanChangeSelectedMemberRole({
          selectedMember: makeUser({ role: "ADMIN" }),
          userCanChangeRoles: true,
          currentUserId: "admin-1",
        }),
      ).toBe(true);
    });
    it("is false for non-admin-switchable roles (e.g. NURSE)", () => {
      expect(
        computeCanChangeSelectedMemberRole({
          selectedMember: makeUser({ role: "NURSE" }),
          userCanChangeRoles: true,
          currentUserId: "admin-1",
        }),
      ).toBe(false);
    });
  });

  describe("computeMemberDialogDescription", () => {
    it("mentions verification/signature for doctors", () => {
      expect(computeMemberDialogDescription(true)).toMatch(/verification/);
    });
    it("is shorter for non-doctors", () => {
      expect(computeMemberDialogDescription(false)).not.toMatch(
        /verification/,
      );
    });
  });

  describe("form default values", () => {
    it("invite form starts blank with NURSE role", () => {
      const defaults = getInviteFormDefaultValues();
      expect(defaults.name).toBe("");
      expect(defaults.email).toBe("");
      expect(defaults.role).toBe("NURSE");
      expect(defaults.password).toBe("");
    });
    it("empty member form matches the invite form shape", () => {
      const empty = getEmptyMemberFormDefaultValues();
      expect(empty).toEqual({
        name: "",
        email: "",
        phoneNumber: "",
        role: "NURSE",
        specialization: "",
        qualification: "",
        registrationNumber: "",
        labId: undefined,
      });
    });
    it("populated form mirrors the member's stored values", () => {
      const form = getMemberFormDefaultValues(
        makeUser({
          name: "Dr. Rao",
          email: "rao@example.com",
          phoneNumber: "+91 98765 43210",
          role: "DOCTOR",
        }),
      );
      expect(form.name).toBe("Dr. Rao");
      expect(form.email).toBe("rao@example.com");
      expect(form.phoneNumber).toBe("+91 98765 43210");
      expect(form.role).toBe("DOCTOR");
    });
  });

  describe("buildUpdateMemberPayload", () => {
    const baseData = {
      name: "Dr. Asha",
      email: "asha@example.com",
      phoneNumber: "+91 98765 43210",
      role: "DOCTOR" as const,
      specialization: "Cardio",
      qualification: "MBBS",
      registrationNumber: "MCI-42",
      labId: undefined as string | undefined,
    };

    it("includes the role when the actor can change roles", () => {
      const payload = buildUpdateMemberPayload("u-1", baseData, true, true);
      expect(payload.role).toBe("DOCTOR");
    });
    it("omits the role when the actor cannot change roles", () => {
      const payload = buildUpdateMemberPayload("u-1", baseData, false, true);
      expect(payload).not.toHaveProperty("role");
    });
    it("includes clinical fields only for doctors", () => {
      const payload = buildUpdateMemberPayload("u-1", baseData, true, true);
      expect(payload.specialization).toBe("Cardio");
      expect(payload.qualification).toBe("MBBS");
      expect(payload.registrationNumber).toBe("MCI-42");

      const nonDoctor = buildUpdateMemberPayload("u-1", baseData, true, false);
      expect(nonDoctor).not.toHaveProperty("specialization");
    });
    it("includes labId only when role is LAB", () => {
      const labData = { ...baseData, role: "LAB" as const, labId: "lab-1" };
      const payload = buildUpdateMemberPayload("u-1", labData, true, false);
      expect(payload.labId).toBe("lab-1");

      const notLab = buildUpdateMemberPayload("u-1", baseData, true, true);
      expect(notLab).not.toHaveProperty("labId");
    });
  });

  describe("buildCreateMemberPayload", () => {
    it("always carries role + password (login details) and never carries memberId", () => {
      const payload = buildCreateMemberPayload({
        ...getInviteFormDefaultValues(),
        name: "Asha",
        email: "asha@example.com",
        password: "TempPass123!",
        role: "DOCTOR",
        specialization: "Cardio",
      });
      expect(payload).not.toHaveProperty("memberId");
      expect(payload.role).toBe("DOCTOR");
      expect(payload.password).toBe("TempPass123!");
      expect(payload.specialization).toBe("Cardio");
    });

    it("includes labId only for LAB role", () => {
      const payload = buildCreateMemberPayload({
        ...getInviteFormDefaultValues(),
        name: "Lab",
        email: "lab@example.com",
        password: "TempPass123!",
        role: "LAB",
        labId: "lab-1",
      });
      expect(payload.labId).toBe("lab-1");
    });
  });
});
