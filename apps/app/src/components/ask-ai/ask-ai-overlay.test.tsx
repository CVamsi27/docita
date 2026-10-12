import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import i18next from "i18next";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it, vi } from "vitest";
import { Button } from "@workspace/ui/components/form/button";
import english from "@/messages/en/AiAssistant.json";
import hindi from "@/messages/hi/AiAssistant.json";
import { AskAiOverlay } from "./ask-ai-overlay";
import { AskAiProvider } from "./ask-ai-provider";
import { useAskAi } from "./ask-ai-context";

vi.unmock("react-i18next");

function Trigger({ scoped }: { scoped: boolean }) {
  const { openOverlay } = useAskAi();
  return (
    <Button
      onClick={() =>
        openOverlay(
          scoped ? { id: "today", label: "on today's workspace" } : undefined,
        )
      }
    >
      {scoped ? "Open scoped helper" : "Open global helper"}
    </Button>
  );
}

async function setup(language = "en", scoped = true) {
  const i18n = i18next.createInstance();
  await i18n.init({
    lng: language,
    fallbackLng: "en",
    resources: { en: { AiAssistant: english }, hi: { AiAssistant: hindi } },
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });
  render(
    <I18nextProvider i18n={i18n}>
      <AskAiProvider>
        <Trigger scoped={scoped} />
        {scoped ? <Trigger scoped={false} /> : null}
        <AskAiOverlay />
      </AskAiProvider>
    </I18nextProvider>,
  );
  const trigger = screen.getByRole("button", {
    name: scoped ? "Open scoped helper" : "Open global helper",
  });
  trigger.focus();
  fireEvent.click(trigger);
  return trigger;
}

describe("Ask AI preview shell", () => {
  it("names the scoped preview and returns keyboard focus after Escape", async () => {
    const trigger = await setup();
    const dialog = screen.getByRole("dialog", { name: "Ask AI" });
    expect(screen.getByText("on today's workspace")).toBeVisible();
    expect(screen.getByText("AI assistant is coming soon.")).toBeVisible();
    expect(
      screen.getByText("AI suggestions are not medical advice."),
    ).toBeVisible();
    fireEvent.keyDown(dialog, { key: "Escape" });
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it("does not invent a context when opened without one", async () => {
    await setup("en", false);
    expect(screen.getByRole("dialog", { name: "Ask AI" })).toBeVisible();
    expect(screen.queryByText("on today's workspace")).not.toBeInTheDocument();
  });

  it("clears the previous context when reopening from the global trigger", async () => {
    await setup();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Open global helper" }));
    expect(screen.getByRole("dialog", { name: "Ask AI" })).toBeVisible();
    expect(screen.queryByText("on today's workspace")).not.toBeInTheDocument();
  });

  it("localizes the shell in Hindi", async () => {
    await setup("hi", false);
    expect(screen.getByRole("dialog", { name: "AI से पूछें" })).toBeVisible();
    expect(screen.getByText("AI सहायक जल्द उपलब्ध होगा।")).toBeVisible();
    expect(
      screen.getByText("AI के सुझाव चिकित्सीय सलाह नहीं हैं।"),
    ).toBeVisible();
  });
});
