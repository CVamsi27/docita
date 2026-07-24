import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ClipboardList, Pill, Stethoscope, Target } from "lucide-react";
import { SectionRail, SectionTabs, type ConsultationSection } from "./SectionRail";
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
  {
    id: "plan",
    letter: "P",
    label: "Plan",
    shortLabel: "Plan",
    icon: Pill,
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
    expect(subj.textContent).toMatch(/Done/i);
    const assess = screen.getByRole("button", { name: /Assessment/i });
    expect(assess.textContent).not.toMatch(/Done/i);
  });

  it("marks Plan documented when follow-up plan is entered", () => {
    useConsultationDraft.getState().setFollowUpPlan("Follow-up in 2 weeks");
    render(
      <SectionRail
        sections={SECTIONS}
        activeSectionId="subjective"
        onSelect={() => {}}
      />,
    );
    const plan = screen.getByRole("button", { name: /Plan/i });
    expect(plan.textContent).toMatch(/Done/i);
  });

  it("marks Objective documented when musculoskeletal notes exist", () => {
    useConsultationDraft.getState().setExamination((prev) => ({
      ...prev,
      systemic: {
        ...prev.systemic,
        musculoskeletal: "Limited ROM left knee",
      },
    }));
    render(
      <SectionRail
        sections={SECTIONS}
        activeSectionId="subjective"
        onSelect={() => {}}
      />,
    );
    const objective = screen.getByRole("button", { name: /Objective/i });
    expect(objective.textContent).toMatch(/Done/i);
  });
});

describe("SectionTabs", () => {
  it("exposes progress steps with aria-current on the active step", () => {
    render(
      <SectionTabs
        sections={SECTIONS}
        activeSectionId="assessment"
        onSelect={() => {}}
      />,
    );
    const list = screen.getByRole("list", { name: /consultation sections/i });
    expect(list).toBeInTheDocument();
    const active = screen.getByRole("button", { name: /Assessment/i });
    expect(active.getAttribute("aria-current")).toBe("step");
  });
});
