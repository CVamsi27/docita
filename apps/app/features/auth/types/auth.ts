export type AuthStep = "email" | "login" | "signup";

export type AuthBrandingStep =
  | AuthStep
  | "choose-path"
  | "verify-email"
  | "verify-email-sent"
  | "forgot-password"
  | "reset-password"
  | "onboarding"
  | "join-clinic"
  | "join-request-status"
  | "verify-doctor";

export type FieldErrors = Record<string, string>;
