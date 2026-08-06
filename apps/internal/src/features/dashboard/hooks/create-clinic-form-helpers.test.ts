import { describe, it, expect } from "vitest";
import {
  INITIAL_FORM_DATA,
  isErrorFieldKey,
  validateCreateClinicForm,
} from "./create-clinic-form-helpers";
import type { CreateClinicFormData } from "./create-clinic-form-helpers";

describe("INITIAL_FORM_DATA", () => {
  it("has all required fields with default values", () => {
    expect(INITIAL_FORM_DATA).toEqual({
      name: "",
      email: "",
      phone: "",
      address: "",
      tier: "STARTER",
      type: "GENERAL",
      adminName: "",
      adminEmail: "",
      adminPassword: "",
      adminType: "admin",
    });
  });
});

describe("isErrorFieldKey", () => {
  it("returns true for valid error field keys", () => {
    expect(isErrorFieldKey("name")).toBe(true);
    expect(isErrorFieldKey("email")).toBe(true);
    expect(isErrorFieldKey("phone")).toBe(true);
    expect(isErrorFieldKey("address")).toBe(true);
    expect(isErrorFieldKey("adminName")).toBe(true);
    expect(isErrorFieldKey("adminEmail")).toBe(true);
    expect(isErrorFieldKey("adminPassword")).toBe(true);
  });

  it("returns false for invalid field keys", () => {
    expect(isErrorFieldKey("tier")).toBe(false);
    expect(isErrorFieldKey("type")).toBe(false);
    expect(isErrorFieldKey("adminType")).toBe(false);
    expect(isErrorFieldKey("nonexistent")).toBe(false);
  });
});

describe("validateCreateClinicForm", () => {
  it("returns errors for all empty required fields", () => {
    const errors = validateCreateClinicForm(INITIAL_FORM_DATA);
    expect(errors.name).toBeDefined();
    expect(errors.email).toBeDefined();
    expect(errors.phone).toBeDefined();
    expect(errors.address).toBeDefined();
    expect(errors.adminName).toBeDefined();
    expect(errors.adminEmail).toBeDefined();
    expect(errors.adminPassword).toBeDefined();
  });

  it("returns empty errors for valid form data", () => {
    const validData: CreateClinicFormData = {
      ...INITIAL_FORM_DATA,
      name: "Test Clinic",
      email: "clinic@example.com",
      phone: "+911234567890",
      address: "123 Test Street",
      adminName: "Admin User",
      adminEmail: "admin@example.com",
      adminPassword: "securePassword123",
    };
    const errors = validateCreateClinicForm(validData);
    expect(errors).toEqual({});
  });

  it("validates email format for clinic email", () => {
    const data: CreateClinicFormData = {
      ...INITIAL_FORM_DATA,
      name: "Test Clinic",
      email: "invalid-email",
      phone: "+911234567890",
      address: "123 Test Street",
      adminName: "Admin",
      adminEmail: "admin@example.com",
      adminPassword: "password",
    };
    const errors = validateCreateClinicForm(data);
    expect(errors.email).toBe("Enter a valid facility email address");
  });

  it("validates email format for admin email", () => {
    const data: CreateClinicFormData = {
      ...INITIAL_FORM_DATA,
      name: "Test Clinic",
      email: "clinic@example.com",
      phone: "+911234567890",
      address: "123 Test Street",
      adminName: "Admin",
      adminEmail: "bad-email",
      adminPassword: "password",
    };
    const errors = validateCreateClinicForm(data);
    expect(errors.adminEmail).toBe("Enter a valid admin email address");
  });

  it("returns no errors for valid empty-but-optional fields", () => {
    const data: CreateClinicFormData = {
      ...INITIAL_FORM_DATA,
      name: "Clinic",
      email: "c@c.com",
      phone: "123",
      address: "Addr",
      adminName: "A",
      adminEmail: "a@a.com",
      adminPassword: "p",
    };
    const errors = validateCreateClinicForm(data);
    expect(errors).toEqual({});
  });
});
