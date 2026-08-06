import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ErrorBoundary } from "@workspace/ui/components/feedback/error-boundary";

function ThrowError({ message }: { message: string }) {
  throw new Error(message);
}

describe("ErrorBoundary", () => {
  it("renders children when no error occurs", () => {
    render(
      <ErrorBoundary>
        <div>Safe content</div>
      </ErrorBoundary>,
    );
    expect(screen.getByText("Safe content")).toBeTruthy();
  });

  it("renders error UI when child throws", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ThrowError message="Test error" />
      </ErrorBoundary>,
    );

    // @workspace/ui ErrorBoundary renders ErrorState with the default
    // "We could not load this section" copy (the raw thrown error is not
    // surfaced) — match the message loosely so the spec stays valid if the
    // sentence is split across elements.
    expect(screen.getByText(/We could not load this section/)).toBeTruthy();
    expect(screen.getByText("Try again")).toBeTruthy();

    vi.restoreAllMocks();
  });

  it("renders custom fallback when provided", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <ErrorBoundary fallback={<div>Custom error</div>}>
        <ThrowError message="Test error" />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Custom error")).toBeTruthy();

    vi.restoreAllMocks();
  });

  it("resets error state on 'Try again' click", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    let shouldThrow = true;
    function ConditionalThrow() {
      if (shouldThrow) throw new Error("Retry error");
      return <div>Recovered</div>;
    }

    render(
      <ErrorBoundary>
        <ConditionalThrow />
      </ErrorBoundary>,
    );

    expect(screen.getByText(/We could not load this section/)).toBeTruthy();

    shouldThrow = false;
    fireEvent.click(screen.getByText("Try again"));
    expect(screen.getByText("Recovered")).toBeTruthy();

    vi.restoreAllMocks();
  });
});
