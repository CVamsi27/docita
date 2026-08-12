export function computeAvailabilitySlotsReady(
  open: boolean | undefined,
  selectedDate: Date | undefined,
  watchedDoctorId: string | undefined,
  slotsQuerySuccess: boolean,
  slotsQueryError: boolean,
): boolean {
  return Boolean(
    open &&
      selectedDate &&
      watchedDoctorId &&
      slotsQuerySuccess &&
      !slotsQueryError,
  );
}
