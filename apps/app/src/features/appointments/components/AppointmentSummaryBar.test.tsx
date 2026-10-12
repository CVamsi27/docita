import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  APPOINTMENT_STATUS_LABELS,
  appointmentStatusSchema,
} from "@workspace/types";
import { enMessages } from "@/messages";
import { render } from "@/test-utils";
import { AppointmentSummaryBar } from "./AppointmentSummaryBar";
import type { AppointmentSummary } from "@/features/appointments/lib/appointments-page-helpers";

/**
 * Row labels must come from `Appointments:summaryBar.status.*`, not from a
 * hardcoded English string. Returning a marker proves the bar actually goes
 * through `t()`; the shipped English wording is pinned separately by the
 * message-parity test below (the real en copy equals the canonical labels, so
 * asserting on real strings here could not tell the two apart).
 */
const translationCalls: Array<{ key: string; options?: unknown }> = [];
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: unknown) => {
      translationCalls.push({ key, options });
      return `[${key}]`;
    },
    i18n: { language: "en", changeLanguage: async () => undefined },
  }),
}));

const summary = (
  breakdown: AppointmentSummary["breakdown"],
  total?: number,
): AppointmentSummary => ({
  total: total ?? breakdown.reduce((sum, row) => sum + row.value, 0),
  breakdown,
});

describe("AppointmentSummaryBar", () => {
  it("renders nothing when there are no appointments", () => {
    const { container } = render(
      <AppointmentSummaryBar summary={{ total: 0, breakdown: [] }} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("resolves every row label through the Appointments namespace", () => {
    render(
      <AppointmentSummaryBar
        summary={summary([
          { appointmentStatus: "scheduled", value: 3, tone: "scheduled" },
          { appointmentStatus: "no-show", value: 1, tone: "warning" },
        ])}
      />,
    );

    expect(translationCalls).toContainEqual({
      key: "summaryBar.status.scheduled",
      options: { defaultValue: APPOINTMENT_STATUS_LABELS.scheduled },
    });
    expect(translationCalls).toContainEqual({
      key: "summaryBar.status.no-show",
      options: { defaultValue: APPOINTMENT_STATUS_LABELS["no-show"] },
    });
    expect(screen.getByText("[summaryBar.status.scheduled]")).toBeInTheDocument();
    expect(screen.getByText("[summaryBar.status.no-show]")).toBeInTheDocument();
  });

  it("looks up a key for every status in the domain", () => {
    render(
      <AppointmentSummaryBar
        summary={summary(
          appointmentStatusSchema.options.map((appointmentStatus) => ({
            appointmentStatus,
            value: 1,
            tone: "scheduled",
          })),
        )}
      />,
    );

    const looked = new Set(
      translationCalls
        .map((call) => call.key)
        .filter((key) => key.startsWith("summaryBar.status.")),
    );
    expect([...looked].sort()).toEqual(
      appointmentStatusSchema.options
        .map((status) => `summaryBar.status.${status}`)
        .sort(),
    );
  });

  it("exposes the breakdown as a list and keys rows by status", () => {
    render(
      <AppointmentSummaryBar
        summary={summary([
          { appointmentStatus: "cancelled", value: 1, tone: "cancelled" },
          { appointmentStatus: "checked-in", value: 2, tone: "success" },
        ])}
      />,
    );

    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("[summaryBar.status.cancelled] 1");
    expect(items[1]).toHaveTextContent("[summaryBar.status.checked-in] 2");
  });
});

describe("Appointments:summaryBar.status copy", () => {
  it("stays in sync with the canonical status labels", () => {
    // The bar falls back to APPOINTMENT_STATUS_LABELS when a key is missing, so
    // an out-of-sync English value would silently ship a label different from
    // every other surface. Pin the two together.
    const appointments = enMessages.Appointments as Record<string, unknown>;
    const statusCopy = (
      appointments.summaryBar as { status: Record<string, string> }
    ).status;

    expect(Object.keys(statusCopy).sort()).toEqual(
      appointmentStatusSchema.options.slice().sort(),
    );
    for (const status of appointmentStatusSchema.options) {
      expect(statusCopy[status]).toBe(APPOINTMENT_STATUS_LABELS[status]);
    }
  });
});