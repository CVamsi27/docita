import { describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import {
  AUTH_RESPONSE_ERROR_MESSAGE,
  MFA_CHALLENGE_ERROR_MESSAGE,
  extractAuthPayload,
  isMfaChallengeResponse,
} from "@/lib/auth/auth-context-helpers";
import { useAuthCredentialActions } from "@/lib/auth/use-auth-credential-actions";

const SESSION_USER = {
  id: "user_1",
  email: "asha@clinic.test",
  name: "Dr Asha Rao",
  role: "DOCTOR",
  clinicId: "clinic_1",
  emailVerified: true,
  onboardingStep: "COMPLETED",
};

const SESSION_BODY = { access_token: "access.jwt.value", user: SESSION_USER };

const MFA_CHALLENGE = {
  mfa_required: true,
  mfa_challenge_token: "mfa_challenge_value",
};

describe("auth challenge detection", () => {
  it("recognises an MFA challenge and nothing else", () => {
    expect(isMfaChallengeResponse(MFA_CHALLENGE)).toBe(true);
    expect(isMfaChallengeResponse(SESSION_BODY)).toBe(false);
    expect(
      isMfaChallengeResponse({ ...MFA_CHALLENGE, mfa_required: false }),
    ).toBe(false);
    expect(isMfaChallengeResponse(null)).toBe(false);
    expect(isMfaChallengeResponse("MFA_REQUIRED")).toBe(false);
  });

  it("still reads no session out of a challenge", () => {
    // The two branches share no required key, so a client that only checks for
    // `access_token` cannot mistake one for the other.
    expect(extractAuthPayload(MFA_CHALLENGE)).toBeNull();
    expect(extractAuthPayload(SESSION_BODY)?.access_token).toBe(
      "access.jwt.value",
    );
  });
});

describe("login flow when the API answers with an MFA challenge", () => {
  function setup(loginResponse: unknown) {
    const persistToken = vi.fn();
    const setUser = vi.fn();
    const setUserRole = vi.fn();
    const persistLoginLockoutUntil = vi.fn();
    const navigate = vi.fn();
    const validateAuth = vi.fn(async () => {
      throw new Error("no session");
    });

    const { result } = renderHook(() =>
      useAuthCredentialActions({
        navigate: navigate as never,
        loginLockoutUntil: null,
        setLoginLockoutUntil: vi.fn(),
        persistToken,
        refreshAccessToken: vi.fn(async () => false),
        setUser,
        setUserRole,
        validateAuth,
        loginMutation: {
          mutateAsync: vi.fn(async () => loginResponse),
        },
        checkEmailMutation: { mutateAsync: vi.fn() },
        registerMutation: { mutateAsync: vi.fn() },
      }),
    );

    return {
      login: result.current.login,
      persistToken,
      setUser,
      setUserRole,
      persistLoginLockoutUntil,
      navigate,
    };
  }

  it("names the two-factor requirement instead of a generic failure", async () => {
    const { login, persistToken, setUser, navigate } = setup(MFA_CHALLENGE);

    await act(async () => {
      await expect(login("asha@clinic.test", "Test@123456")).rejects.toThrow(
        MFA_CHALLENGE_ERROR_MESSAGE,
      );
    });

    // A challenge carries no session: nothing is persisted and the user is not
    // sent anywhere, which is the point of failing before the /auth/validate
    // fallback.
    expect(persistToken).not.toHaveBeenCalled();
    expect(setUser).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it("does not report the generic failure for this case", async () => {
    const { login } = setup(MFA_CHALLENGE);

    await act(async () => {
      await login("asha@clinic.test", "Test@123456").catch((error: unknown) => {
        expect((error as Error).message).not.toBe(AUTH_RESPONSE_ERROR_MESSAGE);
      });
    });
  });

  it("still completes a normal password login", async () => {
    const { login, persistToken, setUser, setUserRole } = setup(SESSION_BODY);

    await act(async () => login("asha@clinic.test", "Test@123456"));

    expect(persistToken).toHaveBeenCalledWith("access.jwt.value");
    expect(setUserRole).toHaveBeenCalledWith("DOCTOR");
    expect(setUser).toHaveBeenCalledWith(
      expect.objectContaining({ id: "user_1" }),
    );
  });
});
