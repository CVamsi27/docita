import type { UserRole } from "../shared/users";

type OnboardingStep =
  | "NOT_STARTED"
  | "CHOOSE_PATH"
  | "CREATING_CLINIC"
  | "JOINING_CLINIC"
  | "COMPLETED";

interface RequestBase {
  headers: Record<string, string | string[] | undefined>;
  body: unknown;
  query: Record<string, string | string[] | undefined>;
  params: Record<string, string>;
}

export interface AuthenticatedRequest extends RequestBase {
  user: {
    id: string;
    sub: string;
    name: string;
    clinicId: string | null;
    role: UserRole;
    email: string;
    emailVerified?: boolean;
    onboardingStep?: OnboardingStep;
  };
}

export interface OptionalAuthRequest extends RequestBase {
  user?: {
    id: string;
    clinicId: string | null;
    role: UserRole;
    email: string;
    emailVerified?: boolean;
    onboardingStep?: OnboardingStep;
  };
}
