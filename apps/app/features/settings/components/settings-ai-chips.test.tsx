import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  AskAiProvider,
  useAskAi,
} from "@/components/ask-ai/ask-ai-context";
import { SettingsAiChips } from "./settings-ai-chips";

vi.mock("@/hooks/use-feature-flag", () => ({
  useFeatureFlag: (key: string) => key === "settings_ai_chips",
}));

function ScopeProbe() {
  const { open, scope } = useAskAi();
  return (
    <div
      data-testid="ask-ai-state"
      data-open={open ? "true" : "false"}
      data-scope-id={scope?.id ?? ""}
      data-scope-label={scope?.label ?? ""}
    />
  );
}

describe("SettingsAiChips", () => {
  it("renders three suggestion chips for the doctor-profile scope", () => {
    render(
      <AskAiProvider>
        <SettingsAiChips scope="doctor-profile" />
      </AskAiProvider>,
    );
    expect(screen.getByText(/Suggested by AI/i)).toBeInTheDocument();
    expect(screen.getByText(/Add a typed signature/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Set your default consultation duration/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Complete your medical council registration/i),
    ).toBeInTheDocument();
  });

  it("opens Ask AI scoped to the settings tab on chip click", () => {
    render(
      <AskAiProvider>
        <SettingsAiChips scope="clinic-general" />
        <ScopeProbe />
      </AskAiProvider>,
    );
    fireEvent.click(screen.getByText(/Set clinic operating hours/i));
    const probe = screen.getByTestId("ask-ai-state");
    expect(probe.getAttribute("data-open")).toBe("true");
    expect(probe.getAttribute("data-scope-id")).toBe("settings:clinic-general");
    expect(probe.getAttribute("data-scope-label")).toBe("on clinic settings");
  });
});
