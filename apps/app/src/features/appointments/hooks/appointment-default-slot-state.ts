export function computeIsResolvingDefaultSlot(
  open: boolean | undefined,
  selectedDate: Date | undefined,
  watchedDoctorId: string | undefined,
  slotsQueryError: boolean,
  slotsQuerySuccess: boolean,
): boolean {
  return Boolean(
    open &&
      selectedDate &&
      watchedDoctorId &&
      !slotsQueryError &&
      !slotsQuerySuccess,
  );
}
