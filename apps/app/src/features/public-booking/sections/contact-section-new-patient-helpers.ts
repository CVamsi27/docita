type SubmitFieldErrorsSetter = React.Dispatch<
  React.SetStateAction<Record<string, string>>
>;

/**
 * Clears a single field's submit error as the user edits it — the same
 * "drop this key from the error map" update repeated for every contact field
 * (first/last name, date of birth, email) in `ContactSectionNewPatient`.
 */
export function clearContactSubmitFieldError(
  setSubmitFieldErrors: SubmitFieldErrorsSetter,
  key: string,
) {
  setSubmitFieldErrors((prev) => {
    const next = { ...prev };
    delete next[key];
    return next;
  });
}

/**
 * Builds a `ContactTextField` `onValueChange` handler that both updates the
 * field's own state and clears its submit error — the same pairing repeated
 * for first name, last name, and email in `ContactSectionNewPatient`.
 */
export function createContactFieldChangeHandler(
  setSubmitFieldErrors: SubmitFieldErrorsSetter,
) {
  return (key: string, setValue: (value: string) => void) =>
    (value: string) => {
      setValue(value);
      clearContactSubmitFieldError(setSubmitFieldErrors, key);
    };
}
