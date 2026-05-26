export function shouldRedirectToWorkspace(
  hasSignature: boolean,
  hasSavedRegistration: boolean,
) {
  return hasSignature && hasSavedRegistration;
}
