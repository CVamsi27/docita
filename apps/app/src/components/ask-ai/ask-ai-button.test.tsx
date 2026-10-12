import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@/test-utils";
import { AskAiButton } from "@/components/ask-ai/ask-ai-button";

const { openOverlay } = vi.hoisted(() => ({ openOverlay: vi.fn() }));
vi.mock("@/components/ask-ai/ask-ai-context", () => ({
  useAskAi: () => ({ openOverlay }),
}));

describe("Compact Ask AI", () => {
  it("exposes its label on keyboard focus and opens the helper once", async () => {
    const handleOpen = vi.fn();
    render(<AskAiButton compact onOpen={handleOpen} />);
    const trigger = screen.getByRole("button", { name: "Ask AI", exact: true });
    trigger.focus();
    await waitFor(() => expect(screen.getByRole("tooltip")).toHaveTextContent("Ask AI"));
    fireEvent.click(trigger);
    expect(handleOpen).toHaveBeenCalledTimes(1);
    expect(openOverlay).toHaveBeenCalledTimes(1);
    expect(trigger).toHaveFocus();
  });
});
