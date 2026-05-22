import { fireEvent, render, screen } from "@testing-library/react";
import { DeleteConfirmDialog } from "./delete-confirm-dialog";
import { describe, expect, it, vi } from "vitest";

describe("DeleteConfirmDialog", () => {
  const mockOnOpenChange = vi.fn();
  const mockOnConfirm = vi.fn();

  it("renders correctly when open", () => {
    render(
      <DeleteConfirmDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onConfirm={mockOnConfirm}
        itemName="Patient Record"
        isLoading={false}
      />,
    );

    expect(screen.getByText("Delete Patient Record?")).toBeInTheDocument();
    expect(
      screen.getByText(/Are you sure you want to delete/i),
    ).toBeInTheDocument();
  });

  it("calls onConfirm when Delete button is clicked", () => {
    render(
      <DeleteConfirmDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onConfirm={mockOnConfirm}
        itemName="Appointment"
        isLoading={false}
      />,
    );

    const deleteButton = screen.getByRole("button", { name: /delete/i });
    fireEvent.click(deleteButton);

    expect(mockOnConfirm).toHaveBeenCalledTimes(1);
  });

  it("calls onOpenChange when Cancel button is clicked", () => {
    render(
      <DeleteConfirmDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onConfirm={mockOnConfirm}
        itemName="Test Item"
        isLoading={false}
      />,
    );

    const cancelButton = screen.getByRole("button", { name: /cancel/i });
    fireEvent.click(cancelButton);

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it("disables buttons when isLoading is true", () => {
    render(
      <DeleteConfirmDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onConfirm={mockOnConfirm}
        itemName="Test Item"
        isLoading={true}
      />,
    );

    const deleteButton = screen.getByRole("button", { name: /delete/i });
    const cancelButton = screen.getByRole("button", { name: /cancel/i });

    expect(deleteButton).toBeDisabled();
    expect(cancelButton).toBeDisabled();
  });
});
