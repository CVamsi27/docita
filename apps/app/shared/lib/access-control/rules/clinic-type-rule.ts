

import type {
  IAccessContext,
  IAccessDecision,
  IAccessRule,
} from "@/lib/access-control/interfaces";
import { getSupportContactText } from "@/lib/constants/support-contact";
import { CLINIC_TYPE_FEATURES, CLINIC_TYPE_LABELS } from "@workspace/types";

export class ClinicTypeBasedAccessRule implements IAccessRule {
  getRuleName(): string {
    return "ClinicTypeBasedAccess";
  }

  getPriority(): number {
    return 25; 
  }

  canAccess(context: IAccessContext): boolean {

    if (!context.clinicType) return true;

    const typeFeatures = CLINIC_TYPE_FEATURES[context.clinicType];
    if (!typeFeatures) return true;

    const specialtyFeatures = [
      "dentalChart",
      "growthChart",
      "ophthalmologyExam",
      "cardiologyExam",
      "gynecologyExam",
      "dermatologyExam",
      "mentalStatusExam",
      "psychiatryExam",
      "visionTest",
      "ecgMonitoring",
      "imagingReview",
      "skinLesionTracking",
      "prenatalCare",
    ];

    const featureName = String(context.feature);
    if (specialtyFeatures.includes(featureName)) {
      const match = Object.entries(typeFeatures).find(
        ([key]) => key === featureName,
      );
      return match?.[1] === true;
    }

    return true;
  }

  getReason(context: IAccessContext): string {
    if (!context.clinicType) return "Clinic type not specified";

    const clinicTypeLabel =
      CLINIC_TYPE_LABELS[context.clinicType] || context.clinicType;
    const featureName = context.feature
      .replace(/([A-Z])/g, " $1")
      .trim()
      .toLowerCase();

    return `The ${featureName} feature is not available for ${clinicTypeLabel} clinics. This feature is specific to other clinic types. Please ${getSupportContactText()} if you need this feature enabled.`;
  }

  getDecision(context: IAccessContext): IAccessDecision {
    const granted = this.canAccess(context);

    return {
      granted,
      reason: granted
        ? "Feature supported by clinic type"
        : this.getReason(context),
      ruleName: this.getRuleName(),
      denialType: granted ? undefined : "clinic_type_unsupported",
      metadata: {
        unsupportedForClinicType: granted ? undefined : context.clinicType,
      },
    };
  }
}
