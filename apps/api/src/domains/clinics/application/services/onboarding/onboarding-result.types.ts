export interface OnboardingResult {
  success: boolean;
  clinicId: string;
  userId: string;
  subscriptionId?: string;
  message: string;
  errors?: string[];
  access_token?: string;
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
    clinicId: string | null;
  };
}
