import type { OnboardingWorkflowService } from './onboarding-workflow.service';

export type OnboardingTx = Parameters<
  OnboardingWorkflowService['createClinic']
>[0];

export type CreatedClinic = Awaited<
  ReturnType<OnboardingWorkflowService['createClinic']>
>;

export type CreatedAdminUser = Awaited<
  ReturnType<OnboardingWorkflowService['createAdminUser']>
>;

export interface OnboardingCreationMarkers {
  clinicId?: string;
  userId?: string;
}

export interface CompletedOnboardingRecords {
  clinic: CreatedClinic;
  adminUser: CreatedAdminUser;
  subscriptionId: string;
}
