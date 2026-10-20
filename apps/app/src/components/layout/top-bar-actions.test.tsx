import { expect, it } from "vitest";
import { fireEvent, render, screen, waitFor } from "@/test-utils";
import { AskAiProvider } from "@/components/ask-ai/ask-ai-provider";
import { AskAiOverlay } from "@/components/ask-ai/ask-ai-overlay";
import { TopBarActions } from "@/components/layout/top-bar-actions";
import { AskAiButton } from "@/components/ask-ai/ask-ai-button";

it("opens the AI shell from its pinned sidebar action", async () => {
  render(
    <AskAiProvider>
      <AskAiButton />
      <AskAiOverlay />
    </AskAiProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Ask AI", exact: true }));
  expect(await screen.findByRole("dialog")).toBeVisible();
});

it("opens the global AI shell from the topbar and restores touch-trigger focus", async () => {
  render(
    <AskAiProvider>
      <TopBarActions />
      <AskAiOverlay />
    </AskAiProvider>,
  );
  const trigger = screen.getByRole("button", { name: "Open Ask AI" });
  expect(trigger).not.toHaveFocus();
  fireEvent.click(trigger);
  fireEvent.keyDown(await screen.findByRole("dialog"), { key: "Escape" });
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  await waitFor(() => expect(trigger).toHaveFocus());
});
