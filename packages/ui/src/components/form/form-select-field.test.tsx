import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FormProvider, useForm } from "react-hook-form";
import { FormSelectField } from "./form-select-field";

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
  fireEvent.pointerDown(screen.getByRole("combobox"), {
    button: 0,
    pointerType: "mouse",
  });
}

interface FormValues {
  leaveType: string;
}

function Harness() {
  const form = useForm<FormValues>({ defaultValues: { leaveType: "" } });
  const watched = form.watch("leaveType");
  return (
    <FormProvider {...form}>
      <FormSelectField
        control={form.control}
        name="leaveType"
        label="Leave type"
        placeholder="Select leave type"
        options={[
          { value: "SICK", label: "Sick leave" },
          { value: "CASUAL", label: "Casual leave", disabled: true },
        ]}
      />
      <output data-testid="value">{watched}</output>
    </FormProvider>
  );
}

interface SentinelFormValues {
  staffId?: string;
}

function SentinelHarness() {
  const form = useForm<SentinelFormValues>({
    defaultValues: { staffId: undefined },
  });
  const watched = form.watch("staffId") ?? "undefined";
  return (
    <FormProvider {...form}>
      <FormSelectField
        control={form.control}
        name="staffId"
        label="On behalf of"
        placeholder="Select a member"
        unsetValue="self"
        unsetLabel="Myself"
        options={[{ value: "u1", label: "Uma" }]}
      />
      <output data-testid="value">{watched}</output>
    </FormProvider>
  );
}

describe("FormSelectField", () => {
  it("renders the label and the placeholder", () => {
    render(<Harness />);

    expect(screen.getByText("Leave type")).toBeInTheDocument();
    expect(screen.getByText("Select leave type")).toBeInTheDocument();
  });

  it("reports the selected option value to the form", async () => {
    render(<Harness />);

    openSelect();
    fireEvent.click(await screen.findByRole("option", { name: "Sick leave" }));

    expect(screen.getByTestId("value")).toHaveTextContent("SICK");
  });

  it("keeps disabled options unselectable", async () => {
    render(<Harness />);

    openSelect();
    const casual = await screen.findByRole("option", { name: "Casual leave" });
    expect(casual).toHaveAttribute("aria-disabled", "true");

    fireEvent.click(casual);
    expect(screen.getByTestId("value")).toHaveTextContent("");
  });

  it("renders the unset sentinel as the initial value", () => {
    render(<SentinelHarness />);

    expect(screen.getByRole("combobox")).toHaveTextContent("Myself");
  });

  it("clears the field back to undefined when the unset sentinel is chosen", async () => {
    render(<SentinelHarness />);

    openSelect();
    fireEvent.click(await screen.findByRole("option", { name: "Uma" }));
    expect(screen.getByTestId("value")).toHaveTextContent("u1");

    openSelect();
    fireEvent.click(await screen.findByRole("option", { name: "Myself" }));
    expect(screen.getByTestId("value")).toHaveTextContent("undefined");
  });
});
