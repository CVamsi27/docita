import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DoctorFilterSelect } from "./doctor-filter-select";

// Radix Select measures its portal content with ResizeObserver, which jsdom
// does not implement. Provide a no-op global (same approach as the app-vite
// test setup; a leaked no-op observer is harmless in the test environment).
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver =
    ResizeObserverMock as unknown as typeof ResizeObserver;
}

// jsdom lacks the Pointer Events capture API and scrollIntoView that Radix
// Select calls when opening. No-op polyfills let the select open.
if (typeof Element.prototype.hasPointerCapture !== "function") {
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.setPointerCapture = () => {};
  Element.prototype.releasePointerCapture = () => {};
}
if (typeof Element.prototype.scrollIntoView !== "function") {
  Element.prototype.scrollIntoView = () => {};
}

// Radix opens the select on pointerdown with left button + mouse pointer type
// (a Radix-internal contract, not a browser requirement — revisit if the
// open-trigger logic changes on a Radix upgrade).
function openSelect() {
  fireEvent.pointerDown(
    screen.getByRole("combobox", { name: "Filter by doctor" }),
    { button: 0, pointerType: "mouse" },
  );
}

describe("DoctorFilterSelect", () => {
  it("renders the trigger with the default aria label", () => {
    render(
      <DoctorFilterSelect
        doctors={[{ id: "d1", name: "Agarwal" }]}
        selectedDoctorId={undefined}
        onDoctorSelect={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("combobox", { name: "Filter by doctor" }),
    ).toBeInTheDocument();
  });

  it("shows All doctors and one option per doctor", async () => {
    render(
      <DoctorFilterSelect
        doctors={[{ id: "d1", name: "Agarwal" }]}
        selectedDoctorId={undefined}
        onDoctorSelect={vi.fn()}
      />,
    );

    openSelect();
    expect(await screen.findByRole("option", { name: "All doctors" }))
      .toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "Dr. Agarwal" }),
    ).toBeInTheDocument();
  });

  it("reports the selected doctor id", async () => {
    const onDoctorSelect = vi.fn();
    render(
      <DoctorFilterSelect
        doctors={[{ id: "d1", name: "Agarwal" }]}
        selectedDoctorId={undefined}
        onDoctorSelect={onDoctorSelect}
      />,
    );

    openSelect();
    fireEvent.click(
      await screen.findByRole("option", { name: "Dr. Agarwal" }),
    );

    expect(onDoctorSelect).toHaveBeenCalledWith("d1");
  });

  it("reports undefined when All doctors is chosen", async () => {
    const onDoctorSelect = vi.fn();
    render(
      <DoctorFilterSelect
        doctors={[{ id: "d1", name: "Agarwal" }]}
        selectedDoctorId="d1"
        onDoctorSelect={onDoctorSelect}
      />,
    );

    openSelect();
    fireEvent.click(
      await screen.findByRole("option", { name: "All doctors" }),
    );

    expect(onDoctorSelect).toHaveBeenCalledWith(undefined);
  });
});
