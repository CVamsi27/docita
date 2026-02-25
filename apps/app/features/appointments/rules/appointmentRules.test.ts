import { describe, expect, it } from "vitest";
import type { Appointment } from "@workspace/types";
import {
  canCancel,
  canCheckIn,
  getAppointmentStatusDisplay,
  isAppointmentPast,
  isAppointmentToday,
  validateAppointmentData,
} from "./appointmentRules";

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
    it("should return true for today appointments", () => {
      const appointment = mockAppointment({
        startTime: new Date().toISOString(),
      });
      expect(isAppointmentToday(appointment)).toBe(true);
    });
  });

  describe("canCheckIn", () => {
    it("should return false for already checked-in appointments", () => {
      const appointment = mockAppointment({
        status: "checked-in",
      });
      expect(canCheckIn(appointment)).toBe(false);
    });

    it("should return true for appointments within check-in window", () => {
      const inFiveMinutes = new Date();
      inFiveMinutes.setMinutes(inFiveMinutes.getMinutes() + 5);
      const appointment = mockAppointment({
        startTime: inFiveMinutes.toISOString(),
      });
      expect(canCheckIn(appointment)).toBe(true);
    });

    it("should allow check-in exactly 60 minutes before", () => {
      const in60Minutes = new Date();
      in60Minutes.setMinutes(in60Minutes.getMinutes() + 60);
      const appointment = mockAppointment({
        startTime: in60Minutes.toISOString(),
      });
      expect(canCheckIn(appointment)).toBe(true);
    });

    it("should NOT allow check-in 61 minutes before", () => {
      const in61Minutes = new Date();
      in61Minutes.setMinutes(in61Minutes.getMinutes() + 61);
      const appointment = mockAppointment({
        startTime: in61Minutes.toISOString(),
      });
      expect(canCheckIn(appointment)).toBe(false);
    });

    it("should allow check-in 15 minutes late", () => {
      const ago15Minutes = new Date();
      ago15Minutes.setMinutes(ago15Minutes.getMinutes() - 15);
      const appointment = mockAppointment({
        startTime: ago15Minutes.toISOString(),
      });
      expect(canCheckIn(appointment)).toBe(true);
    });

    it("should NOT allow check-in 16 minutes late", () => {
      const ago16Minutes = new Date();
      ago16Minutes.setMinutes(ago16Minutes.getMinutes() - 16);
      const appointment = mockAppointment({
        startTime: ago16Minutes.toISOString(),
      });
      expect(canCheckIn(appointment)).toBe(false);
    });
  });

  describe("canCancel", () => {
    it("should allow cancelling scheduled appointments", () => {
      const appointment = mockAppointment({
        status: "scheduled",
      });
      expect(canCancel(appointment)).toBe(true);
    });

    it("should NOT allow cancelling completed appointments", () => {
      const appointment = mockAppointment({
        status: "completed",
      });
      expect(canCancel(appointment)).toBe(false);
    });
  });

  describe("getAppointmentStatusDisplay", () => {
    it("should return Scheduled for scheduled status", () => {
      expect(getAppointmentStatusDisplay("scheduled")).toBe("Scheduled");
    });

    it("should return Checked In for checked-in status", () => {
      expect(getAppointmentStatusDisplay("checked-in")).toBe("Checked In");
    });
  });

  describe("validateAppointmentData", () => {
    it("should validate required fields", () => {
      const valid = {
        patientId: "p1",
        doctorId: "d1",
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
      };
      expect(validateAppointmentData(valid)).toEqual([]);
    });

    it("should return errors for missing fields", () => {
      const invalid = {
        patientId: "",
        doctorId: "",
      };
      const errors = validateAppointmentData(invalid);
      expect(errors.length).toBeGreaterThan(0);
    });
  });
});
