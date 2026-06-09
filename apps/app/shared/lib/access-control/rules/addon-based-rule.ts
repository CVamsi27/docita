

import {
  type AddOnType,
  AddOnType as AddOnTypeEnum,
  type IAccessContext,
  type IAccessRule,
} from "@/lib/access-control/interfaces";

export const FEATURE_ADDON_MAP: Record<string, AddOnType> = {

  WHATSAPP_MESSAGING: AddOnTypeEnum.WHATSAPP,
  WHATSAPP_REMINDERS: AddOnTypeEnum.WHATSAPP,
  WHATSAPP_BROADCASTS: AddOnTypeEnum.WHATSAPP,
  WHATSAPP_TWO_WAY: AddOnTypeEnum.WHATSAPP,
  WHATSAPP_TEMPLATES: AddOnTypeEnum.WHATSAPP,
  WHATSAPP_CHATBOT: AddOnTypeEnum.WHATSAPP,

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

    if (!requiredAddOn) return false;

    return context.addOns.some(
      (addOn) => addOn.type === requiredAddOn && addOn.status === "active",
    );
  }

  getRuleName(): string {
    return "AddOnBasedAccess";
  }

  getPriority(): number {
    return 20; 
  }

  
  getRequiredAddOn(feature: string): AddOnType | undefined {
    return this.featureAddOnMap[feature];
  }

  
  requiresAddOn(feature: string): boolean {
    return feature in this.featureAddOnMap;
  }
}
