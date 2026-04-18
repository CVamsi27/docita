import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ClipboardList, Stethoscope, Target } from "lucide-react";
import {
  SectionRail,
  SectionTabs,
  type ConsultationSection,
} from "./SectionRail";
import { useConsultationDraft } from "@/features/consultation/state/useConsultationDraft";

const SECTIONS: ConsultationSection[] = [
  {
    id: "subjective",
    letter: "S",
    label: "Subjective",
    shortLabel: "Subjective",
    icon: ClipboardList,
  },
  {
    id: "objective",
    letter: "O",
    label: "Objective",
    shortLabel: "Objective",
    icon: Stethoscope,
  },
  {
    id: "assessment",
    letter: "A",
    label: "Assessment",
    shortLabel: "Assessment",
    icon: Target,
  },
];

beforeEach(() => {
  useConsultationDraft.getState().reset();
  useConsultationDraft.getState().hydrate("apt-1", {});
});

describe("SectionRail", () => {
  it("marks the active section with aria-current", () => {
    render(
      <SectionRail
        sections={SECTIONS}
        activeSectionId="objective"
        onSelect={() => {}}
      />,
    );
    const active = screen.getByRole("button", { name: /Objective/i });
    expect(active.getAttribute("aria-current")).toBe("page");
    const inactive = screen.getByRole("button", { name: /Subjective/i });
    expect(inactive.getAttribute("aria-current")).toBeNull();
  });

  it("calls onSelect when a rail item is clicked", () => {
    const onSelect = vi.fn();
    render(
      <SectionRail
        sections={SECTIONS}
        activeSectionId="subjective"
        onSelect={onSelect}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Assessment/i }));
    expect(onSelect).toHaveBeenCalledWith("assessment");
  });

  it("reflects section completion from the draft store", () => {
    useConsultationDraft.getState().setHistory("headache, 2 days");
    render(
      <SectionRail
        sections={SECTIONS}
        activeSectionId="objective"
        onSelect={() => {}}
      />,
    );
    const subj = screen.getByRole("button", { name: /Subjective/i });
    expect(subj.textContent).toMatch(/Documented/i);
    const assess = screen.getByRole("button", { name: /Assessment/i });
    expect(assess.textContent).toMatch(/Pending/i);
  });
});

describe("SectionTabs", () => {
  it("exposes a tablist with aria-selected on the active tab", () => {
    render(
      <SectionTabs
        sections={SECTIONS}
        activeSectionId="assessment"
        onSelect={() => {}}
      />,
    );
    const list = screen.getByRole("tablist");
    expect(list).toBeInTheDocument();
    const active = screen.getByRole("tab", { name: /Assessment/i });
    expect(active.getAttribute("aria-selected")).toBe("true");
  });
});
