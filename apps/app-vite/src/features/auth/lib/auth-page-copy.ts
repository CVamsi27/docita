import type { AuthStep } from "../types/auth";

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