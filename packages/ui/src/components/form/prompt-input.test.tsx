import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PromptInput } from "./prompt-input";

describe("PromptInput", () => {
  it("submits when the user presses Enter without Shift", () => {
    const onSubmit = vi.fn();
    render(<PromptInput onSubmitPrompt={onSubmit} />);
    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "Summarize today" } });
    fireEvent.keyDown(textarea, { key: "Enter" });
    expect(onSubmit).toHaveBeenCalledWith("Summarize today");
  });

  it("does not submit on Shift+Enter (newline)", () => {
    const onSubmit = vi.fn();
    render(<PromptInput onSubmitPrompt={onSubmit} />);
    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "line one" } });
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: true });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("disables the send button when value is empty", () => {
    render(<PromptInput onSubmitPrompt={() => undefined} />);
    const send = screen.getByRole("button", { name: /send prompt/i });
    expect(send).toBeDisabled();
  });

  it("renders a scope chip when provided", () => {
    render(
      <PromptInput
        onSubmitPrompt={() => undefined}
        scopeChip={<span>on Patient X</span>}
      />,
    );
    expect(screen.getByText("on Patient X")).toBeInTheDocument();
  });
});
