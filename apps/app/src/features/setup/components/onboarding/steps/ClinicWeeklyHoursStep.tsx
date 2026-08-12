"use client";

import { useMemo, useState } from "react";
import { Calendar } from "lucide-react";
import { DAY_OF_WEEK_LABELS, type DayOfWeek } from "@workspace/types";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import { OnboardingStepBody, OnboardingStepCard, OnboardingStepFooter, OnboardingStepHeader } from "@/features/setup/components/onboarding/shared";
import type { ClinicWeeklyHourRow } from "@/features/setup/components/onboarding/types";
import { DayRowCard } from "./ClinicWeeklyHoursStepSections";
import { DISPLAY_ORDER, buildWeeklyHourRows, sortRowsForApi } from "./clinic-weekly-hours-helpers";

export function ClinicWeeklyHoursStep({
  initialRows,
  facilityWord,
  onBack,
  onContinue,
}: {
  initialRows: ClinicWeeklyHourRow[];
  facilityWord: string;
  onBack: () => void;
  onContinue: (rows: ClinicWeeklyHourRow[]) => void;
}) {
  const byDay = useMemo(() => {
    const m = new Map<DayOfWeek, ClinicWeeklyHourRow>();
    for (const r of initialRows) {
      m.set(r.dayOfWeek, { ...r });
    }
    return m;
  }, [initialRows]);

  const [rows, setRows] = useState<Record<DayOfWeek, ClinicWeeklyHourRow>>(() =>
    buildWeeklyHourRows(byDay),
  );

  const updateDay = (day: DayOfWeek, patch: Partial<ClinicWeeklyHourRow>) => {
    setRows((prev) => ({
      ...prev,
      [day]: { ...prev[day], ...patch, dayOfWeek: day },
    }));
  };

  const handleContinue = () => {
    const list = DISPLAY_ORDER.map((d) => rows[d]);
    if (!list.some((r) => r.isActive)) {
      showUserFacingErrorToast(
        null,
        "Turn on at least one day with visit hours.",
        "form",
      );
      return;
    }
    for (const r of list) {
      if (r.isActive && r.startTime >= r.endTime) {
        showUserFacingErrorToast(
          null,
          `End time must be after start time on ${DAY_OF_WEEK_LABELS[r.dayOfWeek]}.`,
          "form",
        );
        return;
      }
    }
    onContinue(sortRowsForApi(list));
  };

  return (
    <OnboardingStepCard>
      <OnboardingStepHeader
        stepNumber={2}
        eyebrow="Visit hours"
        icon={<Calendar strokeWidth={1.5} />}
        title={`When is this ${facilityWord.toLowerCase()} open?`}
        description="These hours become the default schedule for online booking. Each doctor can later set their own hours in settings; until then, they follow this weekly pattern."
      />
      <OnboardingStepBody className="space-y-4">
        <div className="space-y-3">
          {DISPLAY_ORDER.map((day) => (
            <DayRowCard
              key={day}
              day={day}
              dayRow={rows[day]}
              onUpdateDay={updateDay}
            />
          ))}
        </div>
      </OnboardingStepBody>
      <OnboardingStepFooter
        back={{ label: "Back to facility details", onClick: onBack }}
        primary={{ label: "Continue to team", onClick: handleContinue }}
      />
    </OnboardingStepCard>
  );
}
