import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  ApiAvailabilitySnapshot,
  ApiUnavailableReason,
} from "@/lib/api/api-availability";
import { ApiAvailabilityGate } from "./api-availability-gate";

const availability = vi.hoisted(() => {
  const retryNow = vi.fn();
  let snapshot = {
    status: "available" as "available" | "unavailable",
    reason: null as null | "api" | "database",
    attempt: 0,
    isProbing: false,
  };
  const store = {
    getSnapshot: () => snapshot,
    subscribe: () => () => {},
    trackResponse: vi.fn(),
    reportUnavailable: vi.fn(),
    reportAvailable: vi.fn(),
    confirmUnavailability: () => Promise.resolve(),
    waitForAvailable: () => Promise.resolve(),
    retryNow,
  };
  return {
    setSnapshot: (next: {
      status: typeof snapshot.status;
      reason: typeof snapshot.reason;
      attempt: number;
      isProbing: boolean;
    }) => {
      snapshot = next;
    },
    retryNow,
    store,
  };
});

vi.mock("@/lib/api/api-availability", () => ({
  getApiAvailabilityStore: availability.store,
  useApiAvailability: () => ({
    ...availability.store.getSnapshot(),
    retryNow: availability.retryNow,
  }),
}));

function setAvailability(snapshot: {
  status: ApiAvailabilitySnapshot["status"];
  reason: ApiUnavailableReason | null;
  attempt?: number;
  isProbing?: boolean;
}) {
  availability.setSnapshot({
    status: snapshot.status,
    reason: snapshot.reason,
    attempt: snapshot.attempt ?? 0,
    isProbing: snapshot.isProbing ?? false,
  });
}

beforeEach(() => {
  availability.retryNow.mockClear();
});

describe("ApiAvailabilityGate", () => {
  it("renders the workspace while the API is available", () => {
    setAvailability({ status: "available", reason: null });

    render(
      <ApiAvailabilityGate>
        <p>workspace</p>
      </ApiAvailabilityGate>,
    );

    expect(screen.getByText("workspace")).toBeInTheDocument();
    expect(availability.retryNow).toHaveBeenCalledTimes(1);
  });

  it("replaces the tree with the warming screen during a database outage", () => {
    setAvailability({ status: "unavailable", reason: "database" });

    render(
      <ApiAvailabilityGate>
        <p>workspace</p>
      </ApiAvailabilityGate>,
    );

    expect(screen.queryByText("workspace")).not.toBeInTheDocument();
    expect(screen.getByText("Getting things ready…")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });

  it("shows the cold-start copy for a generic API outage", () => {
    setAvailability({ status: "unavailable", reason: "api" });

    render(
      <ApiAvailabilityGate>
        <p>workspace</p>
      </ApiAvailabilityGate>,
    );

    expect(screen.getByText("Server is warming up…")).toBeInTheDocument();
  });

  it("disables the retry action while a probe is in flight", () => {
    setAvailability({ status: "unavailable", reason: "api", isProbing: true });

    render(
      <ApiAvailabilityGate>
        <p>workspace</p>
      </ApiAvailabilityGate>,
    );

    expect(screen.getByRole("button", { name: "Checking…" })).toBeDisabled();
  });

  it("explains a long outage once the probe attempts add up", () => {
    setAvailability({ status: "unavailable", reason: "api", attempt: 8 });

    render(
      <ApiAvailabilityGate>
        <p>workspace</p>
      </ApiAvailabilityGate>,
    );

    expect(
      screen.getByText(
        "This is taking longer than usual. Try again, or check your connection.",
      ),
    ).toBeInTheDocument();
  });

  it("retries immediately when the user asks again", () => {
    setAvailability({ status: "unavailable", reason: "api" });

    render(
      <ApiAvailabilityGate>
        <p>workspace</p>
      </ApiAvailabilityGate>,
    );
    availability.retryNow.mockClear();

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(availability.retryNow).toHaveBeenCalledTimes(1);
  });
});
