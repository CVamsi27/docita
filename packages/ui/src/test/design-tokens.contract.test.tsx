/**
 * Design-token contract test.
 *
 * Renders a small set of canonical primitives and asserts that they
 * reference the documented CSS custom properties from `globals.css`.
 * If a token is renamed and a primitive's class is not updated,
 * `getComputedStyle` will fall back to a default and this test will
 * surface the regression — even though jsdom does not resolve the CSS
 * itself, the *class names* should still reference the documented
 * tokens.
 *
 * SYSTEM_DESIGN_AND_PATTERNS.md §28.3 item 23.
 */

import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { Button } from "@workspace/ui/components/form/button";
import { Card } from "@workspace/ui/components/indicators/card";
import { Skeleton } from "@workspace/ui/components/feedback/skeleton";

const EXPECTED_TOKEN_REFERENCES: Record<string, RegExp[]> = {
  // Default-variant button must reference foreground/background tokens
  // (per the current `bg-foreground text-background` design).
  button: [/bg-foreground/, /text-background/],
  // Cards rely on the composite `ui-card-surface` class, which the UI
  // package defines once in globals.css to bind to the surface tokens.
  card: [/ui-card-surface/],
  // Skeleton uses surface token + animate-spin (no animate-pulse per motion policy).
  skeleton: [/bg-(muted|secondary|accent)/],
};

describe("design tokens contract", () => {
  it("Button references the documented token classes", () => {
    const { container } = render(<Button>Hi</Button>);
    const html = container.innerHTML;
    for (const re of EXPECTED_TOKEN_REFERENCES.button) {
      expect(html, `Button is missing class matching ${re}`).toMatch(re);
    }
  });

  it("Card references the documented token classes", () => {
    const { container } = render(<Card data-testid="card">x</Card>);
    const html = container.innerHTML;
    for (const re of EXPECTED_TOKEN_REFERENCES.card) {
      expect(html, `Card is missing class matching ${re}`).toMatch(re);
    }
  });

  it("Skeleton references the documented token classes", () => {
    const { container } = render(<Skeleton className="h-4 w-32" />);
    const html = container.innerHTML;
    for (const re of EXPECTED_TOKEN_REFERENCES.skeleton) {
      expect(html, `Skeleton is missing class matching ${re}`).toMatch(re);
    }
  });

  it("Skeleton does not opt into banned wave/pulse animation", () => {
    const { container } = render(<Skeleton className="h-4 w-32" />);
    const html = container.innerHTML;
    expect(html).not.toMatch(/animate-pulse/);
    expect(html).not.toMatch(/animation="wave"/);
  });
});
