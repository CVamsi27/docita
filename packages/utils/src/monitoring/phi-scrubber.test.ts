import { describe, expect, it } from "vitest";
import { redactPhiDeep, redactString } from "./phi-scrubber.js";
import { scrubSentryEventRecord } from "./sentry-event-scrub.js";

const CAPABILITY = "synthetic-capability-canary";

describe("monitoring URL privacy", () => {
  it.each([
    [
      "/api/v1/doctors/signature/upload/",
      "/api/v1/doctors/signature/upload/[REDACTED]",
    ],
    [
      "/api/v1/clinics/signature/validate-token/",
      "/api/v1/clinics/signature/validate-token/[REDACTED]",
    ],
    ["/upload-signature/", "/upload-signature/[REDACTED]"],
    ["/api/v1/public/patient/rx/", "/api/v1/public/patient/rx/[REDACTED]"],
    ["/api/v1/public/patient/inv/", "/api/v1/public/patient/inv/[REDACTED]"],
    ["/api/v1/public/patient/pay/", "/api/v1/public/patient/pay/[REDACTED]"],
  ])("removes capability path values under %s", (prefix, expected) => {
    const result = redactPhiDeep({
      path: `${prefix}${CAPABILITY}`,
      status: 200,
      method: "GET",
    });
    expect(result).toEqual({ path: expected, status: 200, method: "GET" });
  });

  it.each([
    "token",
    "X-Amz-Signature",
    "hub.verify_token",
    "search",
    "unknown_parameter",
  ])(
    "removes query and fragment values, including %s, from URL fields",
    (key) => {
      expect(
        redactPhiDeep({
          url: `https://app.docita.work/reset-password?${key}=${CAPABILITY}#${CAPABILITY}`,
        }),
      ).toEqual({ url: "https://app.docita.work/reset-password" });
    },
  );

  it("scrubs URLs embedded in access and error messages", () => {
    expect(
      redactString(
        `GET /api/v1/doctors/signature/upload/${CAPABILITY}?expires=123 400 25ms`,
      ),
    ).toBe("GET /api/v1/doctors/signature/upload/[REDACTED] 400 25ms");
    expect(
      redactString(
        `Failed at https://app.docita.work/calendar.ics?token=${CAPABILITY}`,
      ),
    ).toBe("Failed at https://app.docita.work/calendar.ics");
  });

  it("does not erase ordinary route names or opaque resource IDs", () => {
    expect(
      redactPhiDeep({
        route: "/api/v1/patients/p-17/appointments",
        path: "/api/v1/doctors/signature/upload/:token",
      }),
    ).toEqual({
      route: "/api/v1/patients/p-17/appointments",
      path: "/api/v1/doctors/signature/upload/:token",
    });
    expect(redactString("Error at /srv/api/main.js:12:4")).toBe(
      "Error at /srv/api/main.js:12:4",
    );
  });

  it("scrubs request URLs, standalone queries, breadcrumbs and exception URLs before Sentry delivery", () => {
    const event = scrubSentryEventRecord({
      request: {
        url: `https://app.docita.work/upload-signature/${CAPABILITY}?signature=${CAPABILITY}`,
        query_string: `token=${CAPABILITY}`,
      },
      breadcrumbs: [
        {
          data: {
            from: `/reset-password?token=${CAPABILITY}`,
            to: `/upload-signature/${CAPABILITY}`,
            url: `https://api.docita.work/public/patient/rx/${CAPABILITY}/pdf`,
          },
        },
      ],
      exception: {
        values: [
          { type: "Error", value: `Failed /upload-signature/${CAPABILITY}` },
        ],
      },
    });
    expect(JSON.stringify(event)).not.toContain(CAPABILITY);
    expect(event.request).toEqual({
      url: "https://app.docita.work/upload-signature/[REDACTED]",
      query_string: "[REDACTED]",
    });
    expect(event.breadcrumbs[0]?.data.url).toBe(
      "https://api.docita.work/public/patient/rx/[REDACTED]/pdf",
    );
  });

  it("scrubs transaction spans and structured Sentry log attributes", () => {
    const event = scrubSentryEventRecord({
      transaction: `/upload-signature/${CAPABILITY}`,
      spans: [
        {
          description: `GET /api/v1/public/patient/rx/${CAPABILITY}/pdf`,
          data: {
            "http.url": `https://api.docita.work/calendar.ics?token=${CAPABILITY}`,
          },
        },
      ],
      message: `POST /upload-signature/${CAPABILITY}`,
      attributes: { url: `/reset-password?token=${CAPABILITY}` },
    });
    expect(JSON.stringify(event)).not.toContain(CAPABILITY);
    expect(event.spans[0]?.description).toBe(
      "GET /api/v1/public/patient/rx/[REDACTED]/pdf",
    );
  });
});
