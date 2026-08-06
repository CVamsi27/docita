export interface RequestSummaryState {
  hasVisitSelection: boolean;
  scheduleComplete: boolean;
  anyFilled: boolean;
  compact: boolean;
}

export function buildRequestSummaryState(params: {
  selectedDoctorName: string | null;
  selectedCalendarDay: Date | undefined;
  selectedStart: string | null;
  selectedEnd: string | null;
  density: "default" | "compact";
}): RequestSummaryState {
  const scheduleComplete = Boolean(
    params.selectedCalendarDay && params.selectedStart && params.selectedEnd,
  );
  return {
    scheduleComplete,
    hasVisitSelection: Boolean(params.selectedDoctorName && scheduleComplete),
    anyFilled: Boolean(params.selectedDoctorName || params.selectedCalendarDay),
    compact: params.density === "compact",
  };
}
