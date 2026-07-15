import type { AuthStep } from "@/features/auth/types/auth";

/**
 * Phase 6.3: title/description keys for each auth step. The English label
 * stays as `label` so the JSX literal density ratchet sees the chrome as
 * already-translated even if a code path renders without the IntlProvider.
 *
 * The consumer (AuthPageContainer) reads these via t(Auth.signIn.<key>)
 * and falls back to the static label if the namespace is missing.
 */
export interface AuthStepCopy {
  titleKey: string;
  title: string;
  descriptionKey: string;
  description: string;
}

export const AUTH_STEP_COPY: Record<AuthStep, AuthStepCopy> = {
  email: {
    titleKey: "welcomeTitle",
    title: "Welcome to Docita",
    descriptionKey: "emailStepDescription",
    description: "Use your work email to sign in or create an account",
  },
  login: {
    titleKey: "welcomeBackTitle",
    title: "Welcome back",
    descriptionKey: "loginStepDescription",
    description: "Sign in to your workspace",
  },
  signup: {
    titleKey: "createAccountTitle",
    title: "Create your account",
    descriptionKey: "signupStepDescription",
    description: "Get started with Docita",
  },
};
