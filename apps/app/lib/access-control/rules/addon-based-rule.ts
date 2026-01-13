/**
 * Add-on based access control rule
 * Single Responsibility: Evaluate add-on based feature access
 */

import {
  type AddOnType,
  AddOnType as AddOnTypeEnum,
  type IAccessContext,
  type IAccessRule,
} from "../interfaces";

/**
 * Feature to add-on mapping
 * This maps custom feature strings to required add-ons
 */
export const FEATURE_ADDON_MAP: Record<string, AddOnType> = {
  // WhatsApp features (all require WhatsApp add-on)
  WHATSAPP_MESSAGING: AddOnTypeEnum.WHATSAPP,
  WHATSAPP_REMINDERS: AddOnTypeEnum.WHATSAPP,
  WHATSAPP_BROADCASTS: AddOnTypeEnum.WHATSAPP,
  WHATSAPP_TWO_WAY: AddOnTypeEnum.WHATSAPP,
  WHATSAPP_TEMPLATES: AddOnTypeEnum.WHATSAPP,
  WHATSAPP_CHATBOT: AddOnTypeEnum.WHATSAPP,

  // Intelligence features (all require Intelligence add-on)
  AI_PRESCRIPTION_ASSISTANT: AddOnTypeEnum.INTELLIGENCE,
  AI_DIAGNOSIS_HINTS: AddOnTypeEnum.INTELLIGENCE,
  SMART_TASK_ENGINE: AddOnTypeEnum.INTELLIGENCE,
  PREDICTIVE_NO_SHOW: AddOnTypeEnum.INTELLIGENCE,
  PATIENT_SEGMENTATION: AddOnTypeEnum.INTELLIGENCE,
  ANOMALY_DETECTION: AddOnTypeEnum.INTELLIGENCE,
};

export class AddOnBasedAccessRule implements IAccessRule {
  private readonly featureAddOnMap: Record<string, AddOnType>;

  constructor(featureAddOnMap: Record<string, AddOnType> = FEATURE_ADDON_MAP) {
    this.featureAddOnMap = featureAddOnMap;
  }

  canAccess(context: IAccessContext): boolean {
    const featureStr = String(context.feature);
    const requiredAddOn = this.featureAddOnMap[featureStr];

    // If feature doesn't require an add-on, this rule doesn't apply
    if (!requiredAddOn) {
      return false;
    }

    // Check if user has the required add-on and it's active
    return context.addOns.some(
      (addOn) => addOn.type === requiredAddOn && addOn.status === "active",
    );
  }

  getRuleName(): string {
    return "AddOnBasedAccess";
  }

  getPriority(): number {
    return 20; // Higher priority than tier-based
  }

  /**
   * Get the required add-on for a feature
   */
  getRequiredAddOn(feature: string): AddOnType | undefined {
    return this.featureAddOnMap[feature];
  }

  /**
   * Check if a feature requires an add-on
   */
  requiresAddOn(feature: string): boolean {
    return feature in this.featureAddOnMap;
  }
}
