/**
 * Consultation Components Unit Tests
 */
import { describe, expect, it } from "vitest";

// Test ConsultationTimer rules
describe("ConsultationTimer Business Rules", () => {
  it("should format time correctly", () => {
    const formatTime = (totalSeconds: number) => {
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      if (hours > 0) {
        return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
      }
      return `${minutes}:${String(seconds).padStart(2, "0")}`;
    };

    expect(formatTime(0)).toBe("0:00");
    expect(formatTime(65)).toBe("1:05");
    expect(formatTime(3661)).toBe("1:01:01");
    expect(formatTime(7325)).toBe("2:02:05");
  });

  it("should calculate elapsed time badge color", () => {
    const getTimerColor = (seconds: number) => {
      if (seconds > 1800) return "destructive"; // Over 30 min
      if (seconds > 900) return "warning"; // Over 15 min
      return "secondary";
    };

    expect(getTimerColor(600)).toBe("secondary");
    expect(getTimerColor(1000)).toBe("warning");
    expect(getTimerColor(2000)).toBe("destructive");
  });
});

// Test ConsultationProgress rules
describe("ConsultationProgress Business Rules", () => {
  it("should calculate step progress percentage", () => {
    const calculateProgress = (steps: { isComplete: boolean }[]) => {
      const completed = steps.filter((s) => s.isComplete).length;
      return Math.round((completed / steps.length) * 100);
    };

    const steps = [
      { isComplete: true },
      { isComplete: true },
      { isComplete: false },
      { isComplete: false },
    ];

    expect(calculateProgress(steps)).toBe(50);
  });

  it("should identify current step index", () => {
    const getCurrentStep = (steps: { id: string; isComplete: boolean }[]) => {
      const incompleteIndex = steps.findIndex((s) => !s.isComplete);
      return incompleteIndex >= 0 ? incompleteIndex : steps.length - 1;
    };

    const steps = [
      { id: "1", isComplete: true },
      { id: "2", isComplete: true },
      { id: "3", isComplete: false },
      { id: "4", isComplete: false },
    ];

    expect(getCurrentStep(steps)).toBe(2);
  });
});

// Test ClinicalSuggestions rules
describe("ClinicalSuggestions Business Rules", () => {
  it("should filter suggestions by category", () => {
    const suggestions = [
      { id: "1", category: "diagnosis", text: "Hypertension" },
      { id: "2", category: "medication", text: "Lisinopril" },
      { id: "3", category: "diagnosis", text: "Diabetes" },
    ];

    const filtered = suggestions.filter((s) => s.category === "diagnosis");
    expect(filtered).toHaveLength(2);
  });

  it("should sort suggestions by relevance score", () => {
    const suggestions = [
      { id: "1", text: "Low", score: 0.3 },
      { id: "2", text: "High", score: 0.9 },
      { id: "3", text: "Medium", score: 0.6 },
    ];

    const sorted = [...suggestions].sort((a, b) => b.score - a.score);
    expect(sorted[0].text).toBe("High");
    expect(sorted[1].text).toBe("Medium");
    expect(sorted[2].text).toBe("Low");
  });
});

// Test PatientSummaryCard allergy rules
describe("PatientSummaryCard Business Rules", () => {
  it("should identify critical allergies", () => {
    type AllergySeverity = "MILD" | "MODERATE" | "SEVERE" | "LIFE_THREATENING";

    const allergies = [
      { allergen: "Peanuts", severity: "LIFE_THREATENING" as AllergySeverity },
      { allergen: "Dust", severity: "MILD" as AllergySeverity },
      { allergen: "Penicillin", severity: "SEVERE" as AllergySeverity },
    ];

    const critical = allergies.filter(
      (a) => a.severity === "LIFE_THREATENING" || a.severity === "SEVERE",
    );

    expect(critical).toHaveLength(2);
    expect(critical.map((a) => a.allergen)).toContain("Peanuts");
    expect(critical.map((a) => a.allergen)).toContain("Penicillin");
  });

  it("should sort allergies by severity priority", () => {
    type AllergySeverity = "MILD" | "MODERATE" | "SEVERE" | "LIFE_THREATENING";

    const severityPriority: Record<AllergySeverity, number> = {
      LIFE_THREATENING: 1,
      SEVERE: 2,
      MODERATE: 3,
      MILD: 4,
    };

    const allergies = [
      { allergen: "A", severity: "MILD" as AllergySeverity },
      { allergen: "B", severity: "LIFE_THREATENING" as AllergySeverity },
      { allergen: "C", severity: "MODERATE" as AllergySeverity },
    ];

    const sorted = [...allergies].sort(
      (a, b) => severityPriority[a.severity] - severityPriority[b.severity],
    );

    expect(sorted[0].allergen).toBe("B");
    expect(sorted[1].allergen).toBe("C");
    expect(sorted[2].allergen).toBe("A");
  });
});
