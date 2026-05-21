import { describe, expect, it, beforeEach } from "vitest";
import {
  getAuthenticatedLandingPath,
  getPostAuthPath,
} from "./auth-landing-path";
import { APP_REDIRECT_AFTER_LOGIN_KEY } from "@/lib/auth/session";

describe("auth landing path", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("routes unverified users to verify-email-sent", () => {
    expect(
      getPostAuthPath({
        id: "1",
        emailVerified: false,
        clinicId: "c1",
        role: "DOCTOR",
      } as Parameters<typeof getPostAuthPath>[0]),
    ).toBe("/verify-email-sent");
  });

  it("routes doctors with a clinic to consultation", () => {
    expect(
      getPostAuthPath({
        id: "1",
        emailVerified: true,
        clinicId: "c1",
        role: "DOCTOR",
      } as Parameters<typeof getPostAuthPath>[0]),
    ).toBe("/consultation");
  });

  it("prefers a stored safe return path after login", () => {
    sessionStorage.setItem(APP_REDIRECT_AFTER_LOGIN_KEY, "/patients");

    expect(
      getAuthenticatedLandingPath({
        id: "1",
        emailVerified: true,
        clinicId: "c1",
        role: "STAFF",
      } as Parameters<typeof getAuthenticatedLandingPath>[0]),
    ).toBe("/patients");
    expect(sessionStorage.getItem(APP_REDIRECT_AFTER_LOGIN_KEY)).toBeNull();
  });

  it("ignores unsafe stored return paths", () => {
    sessionStorage.setItem(APP_REDIRECT_AFTER_LOGIN_KEY, "https://evil.test");

    expect(
      getAuthenticatedLandingPath({
        id: "1",
        emailVerified: true,
        clinicId: "c1",
        role: "STAFF",
      } as Parameters<typeof getAuthenticatedLandingPath>[0]),
    ).toBe("/today");
  });
});
