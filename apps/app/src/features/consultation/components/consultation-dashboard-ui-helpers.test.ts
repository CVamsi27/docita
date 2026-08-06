import { describe, expect, it } from "vitest";
import {
  buildFollowUpAppointmentHref,
  deriveConsultationDashboardRoles,
} from "./consultation-dashboard-ui-helpers";

describe("deriveConsultationDashboardRoles", () => {
  it("treats an unknown/empty role as receptionist", () => {
    const roles = deriveConsultationDashboardRoles(undefined, true);
    expect(roles).toEqual({
      isDoctor: false,
      isNurse: false,
      canCreateWalkIn: true,
    });
  });

  it("marks DOCTOR and ADMIN_DOCTOR as doctors", () => {
    expect(deriveConsultationDashboardRoles("DOCTOR", false).isDoctor).toBe(
      true,
    );
    expect(deriveConsultationDashboardRoles("ADMIN_DOCTOR", false).isDoctor).toBe(
      true,
    );
    expect(deriveConsultationDashboardRoles("NURSE", false).isDoctor).toBe(
      false,
    );
  });

  it("marks NURSE as nurse", () => {
    const roles = deriveConsultationDashboardRoles("NURSE", false);
    expect(roles.isNurse).toBe(true);
    expect(roles.isDoctor).toBe(false);
  });

  it("allows walk-ins only when permission and role both allow it", () => {
    // Reception/admin/nurse with permission -> allowed
    expect(deriveConsultationDashboardRoles("RECEPTIONIST", true).canCreateWalkIn).toBe(true);
    expect(deriveConsultationDashboardRoles("ADMIN", true).canCreateWalkIn).toBe(true);
    expect(deriveConsultationDashboardRoles("NURSE", true).canCreateWalkIn).toBe(true);
    // Same roles without the create-appointment permission -> blocked
    expect(deriveConsultationDashboardRoles("RECEPTIONIST", false).canCreateWalkIn).toBe(false);
    // Doctors never get the walk-in shortcut even with permission
    expect(deriveConsultationDashboardRoles("DOCTOR", true).canCreateWalkIn).toBe(false);
  });
});

describe("buildFollowUpAppointmentHref", () => {
  it("builds an action=new href when no patient is given", () => {
    expect(buildFollowUpAppointmentHref()).toBe("/appointments?action=new");
  });

  it("appends the patient param when a patient id is given", () => {
    expect(buildFollowUpAppointmentHref("p_42")).toBe(
      "/appointments?action=new&patient=p_42",
    );
  });
});
