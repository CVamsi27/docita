import { describe, expect, it } from "vitest";

import { resolveRovingTablistTarget } from "./roving-tablist";

describe("resolveRovingTablistTarget", () => {
  it("moves forward and wraps to the first option", () => {
    expect(
      resolveRovingTablistTarget({
        key: "ArrowRight",
        count: 3,
        currentIndex: 0,
      }),
    ).toBe(1);
    expect(
      resolveRovingTablistTarget({
        key: "ArrowRight",
        count: 3,
        currentIndex: 2,
      }),
    ).toBe(0);
  });

  it("moves backward and wraps to the last option", () => {
    expect(
      resolveRovingTablistTarget({
        key: "ArrowLeft",
        count: 3,
        currentIndex: 2,
      }),
    ).toBe(1);
    expect(
      resolveRovingTablistTarget({
        key: "ArrowLeft",
        count: 3,
        currentIndex: 0,
      }),
    ).toBe(2);
  });

  it("jumps to the first and last options with Home and End", () => {
    expect(
      resolveRovingTablistTarget({ key: "Home", count: 4, currentIndex: 2 }),
    ).toBe(0);
    expect(
      resolveRovingTablistTarget({ key: "End", count: 4, currentIndex: 1 }),
    ).toBe(3);
  });

  it("skips disabled options", () => {
    const isDisabled = (index: number) => index === 1;

    expect(
      resolveRovingTablistTarget({
        key: "ArrowRight",
        count: 3,
        currentIndex: 0,
        isDisabled,
      }),
    ).toBe(2);
    expect(
      resolveRovingTablistTarget({
        key: "ArrowLeft",
        count: 3,
        currentIndex: 0,
        isDisabled,
      }),
    ).toBe(2);
  });

  it("starts from the edges when the current option is unknown", () => {
    expect(
      resolveRovingTablistTarget({
        key: "ArrowRight",
        count: 3,
        currentIndex: -1,
      }),
    ).toBe(0);
    expect(
      resolveRovingTablistTarget({
        key: "ArrowLeft",
        count: 3,
        currentIndex: -1,
      }),
    ).toBe(2);
  });

  it("ignores keys outside the tab pattern", () => {
    expect(
      resolveRovingTablistTarget({
        key: "ArrowDown",
        count: 3,
        currentIndex: 0,
      }),
    ).toBeNull();
    expect(
      resolveRovingTablistTarget({ key: "Enter", count: 3, currentIndex: 0 }),
    ).toBeNull();
  });

  it("returns null when no option can receive focus", () => {
    expect(
      resolveRovingTablistTarget({
        key: "ArrowRight",
        count: 0,
        currentIndex: -1,
      }),
    ).toBeNull();
    expect(
      resolveRovingTablistTarget({
        key: "ArrowRight",
        count: 2,
        currentIndex: 0,
        isDisabled: () => true,
      }),
    ).toBeNull();
  });
});
