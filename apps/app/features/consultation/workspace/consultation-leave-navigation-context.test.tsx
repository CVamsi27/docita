import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  ConsultationLeaveNavigationProvider,
  useConsultationProgrammaticNavigate,
  useOptionalConsultationProgrammaticNavigate,
} from "./consultation-leave-navigation-context";

function NavigateConsumer() {
  const go = useConsultationProgrammaticNavigate();
  return (
    <button type="button" onClick={() => go("/target")}>
      Go
    </button>
  );
}

function OptionalNavigateConsumer() {
  const go = useOptionalConsultationProgrammaticNavigate();
  return (
    <span data-testid="optional-go">
      {go === null ? "absent" : "present"}
    </span>
  );
}

describe("ConsultationLeaveNavigationProvider", () => {
  it("throws when useConsultationProgrammaticNavigate is used outside the provider", () => {
    expect(() => render(<NavigateConsumer />)).toThrow(
      "useConsultationProgrammaticNavigate must be used within ConsultationLeaveNavigationProvider",
    );
  });

  it("forwards href to the injected navigate handler", () => {
    const attemptNavigateToHref = vi.fn();
    render(
      <ConsultationLeaveNavigationProvider
        attemptNavigateToHref={attemptNavigateToHref}
      >
        <NavigateConsumer />
      </ConsultationLeaveNavigationProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Go" }));
    expect(attemptNavigateToHref).toHaveBeenCalledWith("/target");
  });

  it("useOptionalConsultationProgrammaticNavigate returns null without the provider", () => {
    render(<OptionalNavigateConsumer />);
    expect(screen.getByTestId("optional-go")).toHaveTextContent("absent");
  });

  it("useOptionalConsultationProgrammaticNavigate returns the handler inside the provider", () => {
    const attemptNavigateToHref = vi.fn();
    render(
      <ConsultationLeaveNavigationProvider
        attemptNavigateToHref={attemptNavigateToHref}
      >
        <OptionalNavigateConsumer />
      </ConsultationLeaveNavigationProvider>,
    );
    expect(screen.getByTestId("optional-go")).toHaveTextContent("present");
  });
});
