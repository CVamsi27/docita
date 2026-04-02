import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  type PhoneSignatureQrSession,
  usePhoneSignatureQrFlow,
} from "./use-phone-signature-qr-flow";

const session: PhoneSignatureQrSession = {
  sessionId: "sess_1",
  qrUrl: "https://app.test/upload-signature/onboarding?sessionId=sess_1",
};
const persistedKey = "test_phone_signature_qr_session";

describe("usePhoneSignatureQrFlow", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("auto-starts session, polls, and marks upload as complete", async () => {
    const createSession = vi.fn().mockResolvedValue(session);
    const checkUploaded = vi
      .fn()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    const onUploaded = vi.fn();

    const { result } = renderHook(() =>
      usePhoneSignatureQrFlow({
        createSession,
        checkUploaded,
        onUploaded,
        pollIntervalMs: 20,
      }),
    );

    await waitFor(() => {
      expect(createSession).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(result.current.session?.sessionId).toBe("sess_1");
    });

    await waitFor(() => {
      expect(result.current.isUploaded).toBe(true);
    });

    expect(onUploaded).toHaveBeenCalledWith(session);
  });

  it("allows retry after a failed session creation", async () => {
    const createSession = vi
      .fn()
      .mockRejectedValueOnce(new Error("Failed to generate QR code"))
      .mockResolvedValueOnce(session);
    const checkUploaded = vi.fn().mockResolvedValue(false);

    const { result } = renderHook(() =>
      usePhoneSignatureQrFlow({
        createSession,
        checkUploaded,
        pollIntervalMs: 20,
        autoStart: true,
      }),
    );

    await waitFor(() => {
      expect(result.current.error).toBe("Failed to generate QR code");
    });

    await act(async () => {
      await result.current.retrySession();
    });

    await waitFor(() => {
      expect(result.current.session?.sessionId).toBe("sess_1");
    });
  });

  it("resumes from a persisted session without creating a new one", async () => {
    const persistedSession: PhoneSignatureQrSession = {
      sessionId: "sess_persisted",
      qrUrl:
        "https://app.test/upload-signature/onboarding?sessionId=sess_persisted",
    };
    sessionStorage.setItem(persistedKey, JSON.stringify(persistedSession));

    const createSession = vi.fn().mockResolvedValue(session);
    const checkUploaded = vi
      .fn()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);

    const { result } = renderHook(() =>
      usePhoneSignatureQrFlow({
        createSession,
        checkUploaded,
        pollIntervalMs: 20,
        persistenceKey: persistedKey,
      }),
    );

    expect(result.current.session?.sessionId).toBe("sess_persisted");
    expect(createSession).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(result.current.isUploaded).toBe(true);
    });
  });

  it("can retry when a previous session already exists", async () => {
    const previousSession: PhoneSignatureQrSession = {
      sessionId: "sess_old",
      qrUrl: "https://app.test/upload-signature/onboarding?sessionId=sess_old",
    };
    const nextSession: PhoneSignatureQrSession = {
      sessionId: "sess_new",
      qrUrl: "https://app.test/upload-signature/onboarding?sessionId=sess_new",
    };
    sessionStorage.setItem(persistedKey, JSON.stringify(previousSession));

    const createSession = vi.fn().mockResolvedValue(nextSession);
    const checkUploaded = vi.fn().mockResolvedValue(false);

    const { result } = renderHook(() =>
      usePhoneSignatureQrFlow({
        createSession,
        checkUploaded,
        autoStart: false,
        persistenceKey: persistedKey,
      }),
    );

    expect(result.current.session?.sessionId).toBe("sess_old");

    await act(async () => {
      await result.current.retrySession();
    });

    expect(createSession).toHaveBeenCalledTimes(1);
    expect(result.current.session?.sessionId).toBe("sess_new");
  });

  it("returns false when clipboard API is unavailable", async () => {
    const createSession = vi.fn().mockResolvedValue(session);
    const checkUploaded = vi.fn().mockResolvedValue(false);

    const originalClipboard = navigator.clipboard;
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: undefined,
    });
    try {
      const { result } = renderHook(() =>
        usePhoneSignatureQrFlow({
          createSession,
          checkUploaded,
          autoStart: true,
        }),
      );

      await waitFor(() => {
        expect(result.current.session?.sessionId).toBe("sess_1");
      });

      await expect(result.current.copyLink()).resolves.toBe(false);
    } finally {
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: originalClipboard,
      });
    }
  });
});
