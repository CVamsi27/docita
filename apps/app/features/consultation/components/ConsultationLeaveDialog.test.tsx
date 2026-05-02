import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConsultationLeaveDialog } from "./ConsultationLeaveDialog";
import { useConsultationDraft } from "@/features/consultation/state/useConsultationDraft";

describe("ConsultationLeaveDialog", () => {
  beforeEach(() => {
    useConsultationDraft.getState().reset();
  });

  it("shows saving copy while saveState is saving", () => {
    useConsultationDraft.getState().hydrate("apt-1", {});
    useConsultationDraft.getState().markSaving();

    render(
      <ConsultationLeaveDialog
        open
        onOpenChange={vi.fn()}
        leaveBusy={false}
        onSaveAndLeave={vi.fn()}
        onLeaveWithoutSaving={vi.fn()}
      />,
    );

    expect(
      screen.getByText(
        /Your consultation is still saving\. You can wait here or choose to leave/i,
      ),
    ).toBeInTheDocument();
  });

  it("shows unsaved-changes copy when draft is dirty and not saving", () => {
    useConsultationDraft.getState().hydrate("apt-1", {});
    useConsultationDraft.getState().setHistory("note");

    render(
      <ConsultationLeaveDialog
        open
        onOpenChange={vi.fn()}
        leaveBusy={false}
        onSaveAndLeave={vi.fn()}
        onLeaveWithoutSaving={vi.fn()}
      />,
    );

    expect(
      screen.getByText(
        /You have unsaved changes\. Save your draft before leaving, or leave without saving\./i,
      ),
    ).toBeInTheDocument();
  });

  it("shows unsaved copy and alert when save failed", () => {
    useConsultationDraft.getState().hydrate("apt-1", {});
    useConsultationDraft.getState().markError("Network error");

    render(
      <ConsultationLeaveDialog
        open
        onOpenChange={vi.fn()}
        leaveBusy={false}
        onSaveAndLeave={vi.fn()}
        onLeaveWithoutSaving={vi.fn()}
      />,
    );

    expect(
      screen.getByText(
        /You have unsaved changes\. Save your draft before leaving, or leave without saving\./i,
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Network error");
  });

  it("shows neutral copy when draft is clean and idle", () => {
    useConsultationDraft.getState().hydrate("apt-1", {});

    render(
      <ConsultationLeaveDialog
        open
        onOpenChange={vi.fn()}
        leaveBusy={false}
        onSaveAndLeave={vi.fn()}
        onLeaveWithoutSaving={vi.fn()}
      />,
    );

    expect(
      screen.getByText(/You can leave this consultation workspace\./i),
    ).toBeInTheDocument();
  });

  it("disables destructive and primary actions while saving", () => {
    useConsultationDraft.getState().hydrate("apt-1", {});
    useConsultationDraft.getState().markSaving();

    render(
      <ConsultationLeaveDialog
        open
        onOpenChange={vi.fn()}
        leaveBusy={false}
        onSaveAndLeave={vi.fn()}
        onLeaveWithoutSaving={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Leave without saving" }),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: "Save and leave" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Stay" })).not.toBeDisabled();
  });

  it("invokes handlers from footer actions", () => {
    useConsultationDraft.getState().hydrate("apt-1", {});
    useConsultationDraft.getState().setHistory("x");

    const onOpenChange = vi.fn();
    const onSaveAndLeave = vi.fn();
    const onLeaveWithoutSaving = vi.fn();

    render(
      <ConsultationLeaveDialog
        open
        onOpenChange={onOpenChange}
        leaveBusy={false}
        onSaveAndLeave={onSaveAndLeave}
        onLeaveWithoutSaving={onLeaveWithoutSaving}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Stay" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);

    fireEvent.click(
      screen.getByRole("button", { name: "Leave without saving" }),
    );
    expect(onLeaveWithoutSaving).toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Save and leave" }));
    expect(onSaveAndLeave).toHaveBeenCalled();
  });

  it("shows inline saving label on primary action when leaveBusy", () => {
    useConsultationDraft.getState().hydrate("apt-1", {});
    useConsultationDraft.getState().setHistory("x");

    render(
      <ConsultationLeaveDialog
        open
        onOpenChange={vi.fn()}
        leaveBusy
        onSaveAndLeave={vi.fn()}
        onLeaveWithoutSaving={vi.fn()}
      />,
    );

    const primary = screen.getByRole("button", { name: /^Saving$/ });
    expect(primary).toBeDisabled();
  });
});
