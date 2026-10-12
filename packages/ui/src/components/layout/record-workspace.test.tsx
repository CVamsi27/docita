import { createRef, useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Button } from "../form/button";
import { RecordWorkspace } from "./record-workspace";

function viewport(wide: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: wide,
    media: query,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent: () => true,
  }));
}

function Preview() {
  const [open, setOpen] = useState(false);
  const trigger = createRef<HTMLButtonElement>();
  return (
    <RecordWorkspace
      contextTitle="Facility review"
      contextDescription="Review the selected facility"
      context={<p>Alpha facility details</p>}
      previewOpen={open}
      onPreviewOpenChange={setOpen}
      returnFocusRef={trigger}
    >
      <Button ref={trigger} onClick={() => setOpen(true)}>
        Review Alpha
      </Button>
    </RecordWorkspace>
  );
}

afterEach(() => vi.unstubAllGlobals());

describe("RecordWorkspace", () => {
  it("uses a named desktop region without opening a dialog", () => {
    viewport(true);
    render(<Preview />);
    expect(
      screen.getByRole("complementary", { name: "Facility review" }),
    ).toHaveTextContent("Alpha facility details");
    fireEvent.click(screen.getByRole("button", { name: "Review Alpha" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens a narrow-screen Sheet and returns focus on Escape", async () => {
    viewport(false);
    render(<Preview />);
    const trigger = screen.getByRole("button", { name: "Review Alpha" });
    trigger.focus();
    fireEvent.click(trigger);
    expect(
      screen.getByRole("dialog", { name: "Facility review" }),
    ).toHaveTextContent("Alpha facility details");
    fireEvent.keyDown(screen.getByRole("dialog"), {
      key: "Escape",
      code: "Escape",
    });
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    await waitFor(() => expect(trigger).toHaveFocus());
  });
});
