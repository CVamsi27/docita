import type { AuthStep } from "@/features/auth/types/auth";

export const AUTH_STEP_TITLES: Record<AuthStep, string> = {
  email: "Welcome to Docita",
  login: "Welcome back",
  signup: "Create your account",
};

export const AUTH_STEP_DESCRIPTIONS: Record<AuthStep, string> = {
  email: "Use your work email to sign in or create an account",
  login: "Sign in to your workspace",
  signup: "Get started with Docita",
};
