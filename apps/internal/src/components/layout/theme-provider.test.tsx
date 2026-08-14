import { describe, expect, it, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ThemeProvider } from "./theme-provider";
import { useAppTheme } from "./theme-context";

function matchMediaMock(matches: boolean) {
  const listeners: Array<() => void> = [];
  return {
    matches,
    media: "(prefers-color-scheme: dark)",
    onchange: null,
    addEventListener: (_: string, cb: () => void) => listeners.push(cb),
    removeEventListener: () => undefined,
    addListener: (_: () => void) => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  };
}

function Probe() {
  const { theme, resolvedTheme, setTheme } = useAppTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <span data-testid="resolved">{resolvedTheme}</span>
      <button type="button" onClick={() => setTheme("dark")}>
        set-dark
      </button>
      <button type="button" onClick={() => setTheme("light")}>
        set-light
      </button>
    </div>
  );
}

describe("ThemeProvider", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockReturnValue(matchMediaMock(false)),
    );
  });

  it("defaults to system theme with a light resolution when OS is light", () => {
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    expect(screen.getByTestId("theme").textContent).toBe("system");
    expect(screen.getByTestId("resolved").textContent).toBe("light");
    expect(document.documentElement).not.toHaveClass("dark");
  });

  it("persists a manually chosen theme and applies the dark class", () => {
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    fireEvent.click(screen.getByText("set-dark"));
    expect(screen.getByTestId("theme").textContent).toBe("dark");
    expect(document.documentElement).toHaveClass("dark");
    expect(localStorage.getItem("docita-internal-theme")).toBe("dark");
  });

  it("reads the legacy docita-theme key for pre-cutover users", () => {
    localStorage.setItem("docita-theme", "dark");
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    expect(screen.getByTestId("theme").textContent).toBe("dark");
    expect(document.documentElement).toHaveClass("dark");
  });
});
