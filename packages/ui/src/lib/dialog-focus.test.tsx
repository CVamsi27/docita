import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import {
  getFocusableElements,
  resolveDialogTabTarget,
  useDialogFocus,
} from "./dialog-focus";

function DialogHarness() {
  const [open, setOpen] = useState(false);
  const containerRef = useDialogFocus(open);

  return (
    <div>
      <button type="button" onClick={() => setOpen(true)}>
        Enlarge Today
      </button>
      {open ? (
        <div
          ref={containerRef}
          role="dialog"
          aria-modal="true"
          aria-label="Screenshot preview"
          tabIndex={-1}
        >
          <button type="button" onClick={() => setOpen(false)}>
            Close preview
          </button>
          <button type="button">Next screenshot</button>
          <button type="button" disabled>
            Previous screenshot
          </button>
        </div>
      ) : null}
    </div>
  );
}

describe("resolveDialogTabTarget", () => {
  it("wraps forward from the last stop to the first", () => {
    expect(
      resolveDialogTabTarget({ shiftKey: false, currentIndex: 2, count: 3 }),
    ).toBe(0);
  });

  it("lets the browser tab forward from any other stop", () => {
    expect(
      resolveDialogTabTarget({ shiftKey: false, currentIndex: 0, count: 3 }),
    ).toBeNull();
  });

  it("wraps backward from the first stop to the last", () => {
    expect(
      resolveDialogTabTarget({ shiftKey: true, currentIndex: 0, count: 3 }),
    ).toBe(2);
  });

  it("lets the browser tab backward from any other stop", () => {
    expect(
      resolveDialogTabTarget({ shiftKey: true, currentIndex: 2, count: 3 }),
    ).toBeNull();
  });

  it("sends focus inside when the current stop is unknown", () => {
    expect(
      resolveDialogTabTarget({ shiftKey: false, currentIndex: -1, count: 3 }),
    ).toBe(0);
    expect(
      resolveDialogTabTarget({ shiftKey: true, currentIndex: -1, count: 3 }),
    ).toBe(2);
  });

  it("ignores an empty container", () => {
    expect(
      resolveDialogTabTarget({ shiftKey: false, currentIndex: 0, count: 0 }),
    ).toBeNull();
  });
});

describe("getFocusableElements", () => {
  it("skips disabled, hidden and explicitly unfocusable nodes", () => {
    render(
      <div data-testid="container">
        <button type="button">Visible</button>
        <button type="button" disabled>
          Disabled
        </button>
        <button type="button" hidden>
          Hidden
        </button>
        <button type="button" tabIndex={-1}>
          Unfocusable
        </button>
        <div aria-hidden="true">
          <button type="button">Inside hidden tree</button>
        </div>
      </div>,
    );

    const container = screen.getByTestId("container");
    expect(
      getFocusableElements(container).map((element) => element.textContent),
    ).toEqual(["Visible"]);
  });
});

describe("useDialogFocus", () => {
  it("moves focus to the first stop when the dialog opens", () => {
    render(<DialogHarness />);

    fireEvent.click(screen.getByRole("button", { name: "Enlarge Today" }));

    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Close preview" }),
    );
  });

  it("cycles Tab within the dialog instead of reaching the page behind", () => {
    render(<DialogHarness />);
    fireEvent.click(screen.getByRole("button", { name: "Enlarge Today" }));

    const close = screen.getByRole("button", { name: "Close preview" });
    const next = screen.getByRole("button", { name: "Next screenshot" });

    // Mid-list Tab stays with the browser, so the event is not cancelled.
    expect(fireEvent.keyDown(close, { key: "Tab" })).toBe(true);

    // The disabled stop is skipped, so the last enabled stop wraps to the first.
    fireEvent.keyDown(next, { key: "Tab" });
    expect(document.activeElement).toBe(close);
  });

  it("cycles Shift+Tab backward and returns focus to the trigger on close", () => {
    render(<DialogHarness />);
    const trigger = screen.getByRole("button", { name: "Enlarge Today" });
    trigger.focus();
    fireEvent.click(trigger);

    const close = screen.getByRole("button", { name: "Close preview" });
    fireEvent.keyDown(close, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Next screenshot" }),
    );

    fireEvent.click(close);
    expect(document.activeElement).toBe(trigger);
  });
});
