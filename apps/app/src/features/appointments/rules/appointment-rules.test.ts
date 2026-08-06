import { describe, expect, it } from "vitest";
import type { Appointment } from "@workspace/types";
import {
  canCancel,
  canCheckIn,
  canStartConsultationAtTime,
  getAppointmentStatusDisplay,
  isAppointmentPast,
  isAppointmentToday,
  isConsultationReadOnlyStatus,
  validateAppointmentData,
} from "./appointment-rules";

const mockAppointment = (overrides: Partial<Appointment>): Appointment => {
  return {
    id: "test-id",
    startTime: new Date().toISOString(),
    endTime: new Date().toISOString(),
    status: "scheduled",
    patientId: "patient-1",
    doctorId: "doctor-1",
    clinicId: "clinic-1",
    type: "CONSULTATION",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  } as Appointment;
};

describe("Appointment Business Rules", () => {
  describe("isAppointmentPast", () => {
    it("should return true for past appointments", () => {
      const appointment = mockAppointment({
        startTime: new Date("2020-01-01").toISOString(),
      });
      expect(isAppointmentPast(appointment)).toBe(true);
    });

    it("should return false for future appointments", () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const appointment = mockAppointment({
        startTime: tomorrow.toISOString(),
      });
      expect(isAppointmentPast(appointment)).toBe(false);
    });
  });

  describe("isAppointmentToday", () => {
    it("should return true for today's appointments", () => {
      const appointment = mockAppointment({
        startTime: new Date().toISOString(),
      });
      expect(isAppointmentToday(appointment)).toBe(true);
    });

    it("should return false for non-today appointments", () => {
      const appointment = mockAppointment({
        startTime: new Date("2025-01-01").toISOString(),
      });
      expect(isAppointmentToday(appointment)).toBe(false);
    });
  });

  describe("isConsultationReadOnlyStatus", () => {
    it("should return true for completed appointments", () => {
      expect(isConsultationReadOnlyStatus("completed")).toBe(true);
    });

    it("should return true for no-show appointments", () => {
      expect(isConsultationReadOnlyStatus("no-show")).toBe(true);
    });

    it("should return false for active statuses", () => {
      expect(isConsultationReadOnlyStatus("in-progress")).toBe(false);
      expect(isConsultationReadOnlyStatus("scheduled")).toBe(false);
    });

    it("should handle undefined status", () => {
      expect(isConsultationReadOnlyStatus(undefined)).toBe(false);
    });
  });

  describe("canCheckIn", () => {
    it("should return false when already checked in or in progress", () => {
      const checkedIn = mockAppointment({ status: "checked-in" });
      const inProgress = mockAppointment({ status: "in-progress" });
      expect(canCheckIn(checkedIn)).toBe(false);
      expect(canCheckIn(inProgress)).toBe(false);
    });

    it("should return true within the check-in window", () => {
      const apt = mockAppointment({
        status: "scheduled",
        startTime: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      });
      expect(canCheckIn(apt)).toBe(true);
    });
  });

  describe("canCancel", () => {
    it("should return false for completed or cancelled", () => {
      expect(canCancel(mockAppointment({ status: "completed" }))).toBe(false);
      expect(canCancel(mockAppointment({ status: "cancelled" }))).toBe(false);
    });

    it("should return true for scheduled", () => {
      expect(canCancel(mockAppointment({ status: "scheduled" }))).toBe(true);
    });
  });

  describe("canStartConsultationAtTime", () => {
    it("should always allow terminal and in-progress visits", () => {
      expect(
        canStartConsultationAtTime(
          { status: "completed", startTime: "2020-01-01T00:00:00Z" },
          new Date(),
        ),
      ).toBe(true);
      expect(
        canStartConsultationAtTime(
          { status: "no-show", startTime: "2020-01-01T00:00:00Z" },
          new Date(),
        ),
      ).toBe(true);
      expect(
        canStartConsultationAtTime(
          { status: "in-progress", startTime: "2020-01-01T00:00:00Z" },
          new Date(),
        ),
      ).toBe(true);
    });

    it("should never allow cancelled", () => {
      expect(
        canStartConsultationAtTime(
          { status: "cancelled", startTime: "2020-01-01T00:00:00Z" },
          new Date(),
        ),
      ).toBe(false);
    });

    it("should allow scheduled only once start time arrives", () => {
      const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      const past = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      expect(
        canStartConsultationAtTime({ status: "scheduled", startTime: future }),
      ).toBe(false);
      expect(
        canStartConsultationAtTime({ status: "scheduled", startTime: past }),
      ).toBe(true);
    });
  });

  describe("validateAppointmentData", () => {
    it("should collect missing required fields", () => {
      const errors = validateAppointmentData({});
      expect(errors).toContain("Select a patient");
      expect(errors).toContain("Select a doctor");
      expect(errors).toContain("Choose a start time");
    });

    it("should flag end before start", () => {
      const errors = validateAppointmentData({
        patientId: "p1",
        doctorId: "d1",
        startTime: "2025-01-02T10:00:00Z",
        endTime: "2025-01-02T09:00:00Z",
      });
      expect(errors).toContain(
        "Choose an end time after the start time",
      );
    });
  });

  describe("getAppointmentStatusDisplay", () => {
    it("should map statuses to display labels", () => {
      expect(getAppointmentStatusDisplay("scheduled")).toBe("Scheduled");
      expect(getAppointmentStatusDisplay("checked-in")).toBe("Checked In");
      expect(getAppointmentStatusDisplay("in-progress")).toBe("Active");
      expect(getAppointmentStatusDisplay("completed")).toBe("Completed");
      expect(getAppointmentStatusDisplay("no-show")).toBe("No Show");
    });

    it("should return Unknown for unrecognized statuses", () => {
      expect(getAppointmentStatusDisplay("weird")).toBe("Unknown");
    });
  });
});
