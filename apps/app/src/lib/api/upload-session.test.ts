import { beforeEach, describe, expect, it, vi } from "vitest";
import type { z } from "zod";

const apiMock = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  validate: vi.fn(),
}));

vi.mock("@/lib/api/api-client", () => ({
  api: apiMock,
  apiFetch: vi.fn(),
  getAuthHeaders: () => ({}),
}));

import {
  fetchSlaSignatureSessionStatus,
  uploadSlaSignatureSession,
} from "./sla-signature-session";
import { uploadFileToSession, uploadFileViaSession } from "./upload-session";

const UPLOAD_ROW = {
  id: "ups-1",
  status: "uploaded",
  fileUrl: "https://cdn.example.com/signature.png",
  createdAt: "2026-07-04T09:40:00.000Z",
  expiresAt: "2026-07-04T10:00:00.000Z",
};

const CREATE_ROW = {
  ...UPLOAD_ROW,
  status: "pending",
  fileUrl: null,
  uploadSecret: "plaintext-secret",
};

const STATUS_ROW = { status: "pending", uploaded: false, fileUrl: null };

/** The schema the app handed to `api.validate` for the most recent call. */
function lastValidateSchema(): z.ZodType<unknown> {
  const call = apiMock.validate.mock.calls.at(-1);
  if (!call) throw new Error("api.validate was not called");
  return call[1] as z.ZodType<unknown>;
}

function file(): File {
  return new File(["binary"], "signature.png", { type: "image/png" });
}

beforeEach(() => {
  vi.clearAllMocks();
  apiMock.validate.mockResolvedValue(undefined);
});

/**
 * All three onboarding signature routes are `@Public()`. Both lib modules used
 * to hand-write their response types:
 *
 *   SignatureSessionStatus { status?, uploaded?, fileUrl? }   // {} satisfied it
 *   uploadSlaSignatureSession(): Promise<unknown>
 *   UploadSessionCredentials { id, uploadSecret }             // 2nd copy
 *   UploadSessionResponse { id?, status?, fileUrl? }         // {} satisfied it
 *
 * An all-optional status type means a status endpoint that stopped answering
 * reads as "not uploaded yet" forever, and `use-mobile-upload` branches on
 * `status === "uploaded"` to tell a patient their upload succeeded.
 */
describe("upload-session contracts", () => {
  it("parses the created session against the shared contract", async () => {
    // uploadFileViaSession makes two calls: create the session, then upload.
    apiMock.validate
      .mockResolvedValueOnce(CREATE_ROW)
      .mockResolvedValueOnce(UPLOAD_ROW);

    const session = await uploadFileViaSession(file());

    expect(apiMock.validate.mock.calls[0][0]).toBe("/uploads/session");
    expect(session.id).toBe("ups-1");
    expect(session.fileUrl).toBe("https://cdn.example.com/signature.png");
  });

  it("sends the secret as an X-Upload-Secret header", async () => {
    apiMock.validate.mockResolvedValueOnce(UPLOAD_ROW);

    await uploadFileToSession({
      sessionId: "ups-1",
      uploadSecret: "plaintext-secret",
      file: file(),
    });

    const options = apiMock.validate.mock.calls[0][2];
    expect(options?.method).toBe("POST");
    expect(
      (options?.headers as Record<string, string>)["X-Upload-Secret"],
    ).toBe("plaintext-secret");
    expect(options?.body).toBeInstanceOf(FormData);
  });

  it("no longer accepts an empty upload response", async () => {
    apiMock.validate.mockResolvedValueOnce(UPLOAD_ROW);
    await uploadFileToSession({
      sessionId: "ups-1",
      uploadSecret: "plaintext-secret",
      file: file(),
    });

    const schema = apiMock.validate.mock.calls[0][1] as z.ZodType<unknown>;
    expect(schema.safeParse(UPLOAD_ROW).success).toBe(true);
    // The old interface had id/status/fileUrl all optional, so `{}` passed.
    expect(schema.safeParse({}).success).toBe(false);
  });

  it("refuses a created session with a blank secret", async () => {
    apiMock.validate
      .mockResolvedValueOnce(CREATE_ROW)
      .mockResolvedValueOnce(UPLOAD_ROW);
    await uploadFileViaSession(file());

    // The create contract is the one on the first call.
    const schema = apiMock.validate.mock.calls[0][1] as z.ZodType<unknown>;
    expect(schema.safeParse(CREATE_ROW).success).toBe(true);
    expect(
      schema.safeParse({ ...CREATE_ROW, uploadSecret: '' }).success,
    ).toBe(false);
  });
});

describe("sla-signature-session contracts", () => {
  it("reads the status from the public status route", async () => {
    apiMock.validate.mockResolvedValueOnce(STATUS_ROW);

    const status = await fetchSlaSignatureSessionStatus("onb-1", "ups-1", 123);

    expect(apiMock.validate.mock.calls[0][0]).toBe(
      "/onboarding/onb-1/sla-signature-session/ups-1/status?ts=123",
    );
    expect(status).toEqual(STATUS_ROW);
  });

  it("refuses an empty status payload", async () => {
    apiMock.validate.mockResolvedValueOnce(STATUS_ROW);
    await fetchSlaSignatureSessionStatus("onb-1", "ups-1");

    const schema = lastValidateSchema();
    expect(schema.safeParse(STATUS_ROW).success).toBe(true);
    expect(schema.safeParse({}).success).toBe(false);
  });

  it("requires every status field, not just the ones it reads", async () => {
    apiMock.validate.mockResolvedValueOnce(STATUS_ROW);
    await fetchSlaSignatureSessionStatus("onb-1", "ups-1");

    const schema = lastValidateSchema();
    for (const key of ["status", "uploaded", "fileUrl"]) {
      const { [key]: _dropped, ...rest } = STATUS_ROW;
      expect(
        schema.safeParse(rest).success,
        `expected "${key}" to be required`,
      ).toBe(false);
    }
  });

  it("parses the uploaded session from the public upload route", async () => {
    apiMock.validate.mockResolvedValueOnce(UPLOAD_ROW);

    const uploaded = await uploadSlaSignatureSession({
      onboardingId: "onb-1",
      sessionId: "ups-1",
      uploadSecret: "plaintext-secret",
      file: file(),
    });

    expect(apiMock.validate.mock.calls[0][0]).toBe(
      "/onboarding/onb-1/sla-signature-session/ups-1",
    );
    expect(uploaded.status).toBe("uploaded");
    expect(uploaded.fileUrl).toBe("https://cdn.example.com/signature.png");
  });

  it("keeps cache-busting off the status request", async () => {
    apiMock.validate.mockResolvedValueOnce(STATUS_ROW);

    await fetchSlaSignatureSessionStatus("onb-1", "ups-1");

    expect(apiMock.validate.mock.calls[0][2]).toMatchObject({
      method: "GET",
      cache: "no-store",
    });
  });
});