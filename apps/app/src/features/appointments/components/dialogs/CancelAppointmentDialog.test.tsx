import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CancelAppointmentDialog } from "./CancelAppointmentDialog";

describe("CancelAppointmentDialog", () => {
  it("requires an auditable cancellation reason before confirming", async () => {
    const onConfirm = vi.fn();

    render(
      <CancelAppointmentDialog
        open
        onOpenChange={vi.fn()}
        onConfirm={onConfirm}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Cancel Appointment" }));

    expect(
      await screen.findByText("Select a cancellation reason"),
    ).toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("submits a selected reason and closes the dialog", async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    const onOpenChange = vi.fn();

    render(
      <CancelAppointmentDialog
        open
        onOpenChange={onOpenChange}
        onConfirm={onConfirm}
      />,
    );

    fireEvent.click(screen.getByRole("combobox", { name: "" }));
    fireEvent.click(await screen.findByText("Doctor unavailable"));
    fireEvent.click(screen.getByRole("button", { name: "Cancel Appointment" }));

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledWith("doctor-unavailable");
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("resets local validation state when cancelled", async () => {
    const onOpenChange = vi.fn();

    const { rerender } = render(
      <CancelAppointmentDialog
        open
        onOpenChange={onOpenChange}
        onConfirm={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Cancel Appointment" }));
    expect(
      await screen.findByText("Select a cancellation reason"),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Keep Appointment" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);

    rerender(
      <CancelAppointmentDialog
        open
        onOpenChange={onOpenChange}
        onConfirm={vi.fn()}
      />,
    );

    expect(
      screen.queryByText("Select a cancellation reason"),
    ).not.toBeInTheDocument();
  });
});
