import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ContactSalesModalUI } from "./ContactSalesModalUI";

describe("ContactSalesModalUI", () => {
  it("shows validation and server error states before submit", async () => {
    const onSubmit = vi.fn();

    render(
      <ContactSalesModalUI
        open
        isSubmitting={false}
        submitted={false}
        error="Sales inbox is temporarily unavailable."
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    expect(
      screen.getByText("Sales inbox is temporarily unavailable."),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Send Inquiry" }));

    expect(await screen.findByText("Enter name.")).toBeInTheDocument();
    expect(screen.getByText("Enter an email address")).toBeInTheDocument();
    expect(screen.getByText("Enter message.")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits valid sales inquiry details and supports cancel", async () => {
    const onSubmit = vi.fn();
    const onClose = vi.fn();

    render(
      <ContactSalesModalUI
        open
        isSubmitting={false}
        submitted={false}
        error={null}
        onClose={onClose}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText("Your name"), {
      target: { value: "Dr. Asha Rao" },
    });
    fireEvent.change(screen.getByPlaceholderText("your@email.com"), {
      target: { value: "asha@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Your facility name"), {
      target: { value: "Asha Care" },
    });
    fireEvent.change(screen.getByPlaceholderText("Tell us about your needs..."), {
      target: { value: "We need a multi-doctor billing rollout." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send Inquiry" }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        name: "Dr. Asha Rao",
        email: "asha@example.com",
        clinic: "Asha Care",
        message: "We need a multi-doctor billing rollout.",
      });
    });

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("renders the success confirmation instead of the form", () => {
    render(
      <ContactSalesModalUI
        open
        isSubmitting={false}
        submitted
        error={null}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByText("Message Sent!")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Send Inquiry" }),
    ).not.toBeInTheDocument();
  });
});
