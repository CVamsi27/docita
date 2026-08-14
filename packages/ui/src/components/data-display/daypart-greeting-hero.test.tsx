import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import {
  type Daypart,
  DaypartGreetingHero,
  getDaypartFromHour,
} from "./daypart-greeting-hero";

const GREETINGS: Record<Daypart, string> = {
  morning: "Good morning",
  afternoon: "Good afternoon",
  evening: "Good evening",
};

describe("getDaypartFromHour", () => {
  it("returns morning for hours before noon", () => {
    expect(getDaypartFromHour(0)).toBe("morning");
    expect(getDaypartFromHour(6)).toBe("morning");
    expect(getDaypartFromHour(11)).toBe("morning");
  });

  it("returns afternoon from noon through 16:59", () => {
    expect(getDaypartFromHour(12)).toBe("afternoon");
    expect(getDaypartFromHour(15)).toBe("afternoon");
    expect(getDaypartFromHour(16)).toBe("afternoon");
  });

  it("returns evening from 17:00 through 23:59", () => {
    expect(getDaypartFromHour(17)).toBe("evening");
    expect(getDaypartFromHour(20)).toBe("evening");
    expect(getDaypartFromHour(23)).toBe("evening");
  });
});

describe("DaypartGreetingHero", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 8, 9, 30)); // 09:30 local = morning
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the serif daypart greeting with eyebrow and live clock", () => {
    render(
      <DaypartGreetingHero
        greetings={GREETINGS}
        eyebrow="Today"
        timeLocale="en-IN"
      />,
    );

    const heading = screen.getByRole("heading", { level: 2 });
    expect(heading).toHaveClass("font-serif");
    expect(heading).toHaveTextContent("Good morning");
    expect(screen.getByText("Today")).toBeInTheDocument();
    expect(screen.getByText("09:30")).toBeInTheDocument();
  });

  it("picks the greeting from the current local daypart", () => {
    vi.setSystemTime(new Date(2026, 0, 8, 18, 0)); // 18:00 = evening
    render(<DaypartGreetingHero greetings={GREETINGS} eyebrow="Today" />);
    expect(
      screen.getByRole("heading", { level: 2 }),
    ).toHaveTextContent("Good evening");
  });

  it("updates the clock when the interval fires", () => {
    render(<DaypartGreetingHero greetings={GREETINGS} eyebrow="Today" />);
    expect(screen.getByText("09:30")).toBeInTheDocument();

    act(() => {
      vi.setSystemTime(new Date(2026, 0, 8, 9, 45));
      vi.advanceTimersByTime(30_000);
    });

    expect(screen.getByText("09:45")).toBeInTheDocument();
  });

  it("renders the optional description and supports centered alignment", () => {
    const { container } = render(
      <DaypartGreetingHero
        greetings={GREETINGS}
        eyebrow="आज"
        description="आंतरिक कंसोल"
        align="center"
      />,
    );
    expect(screen.getByText("आंतरिक कंसोल")).toBeInTheDocument();
    expect(container.firstChild).toHaveClass("text-center");
  });
});
