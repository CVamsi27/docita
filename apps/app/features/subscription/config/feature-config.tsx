import {
  BarChart3,
  Brain,
  Building2,
  Calendar,
  CalendarOff,
  FileText,
  FlaskConical,
  Lock,
  LucideIcon,
  MessageSquare,
  Package,
  Paintbrush,
  Receipt,
  ScanLine,
  Shield,
  Sparkles,
  Syringe,
  Ticket,
  Upload,
  Users,
  Zap,
} from "lucide-react";
import { Feature, FEATURE_DISPLAY } from "@/lib/subscription/tier-access";

export const FEATURE_ICONS: Record<Feature, LucideIcon> = {

  [Feature.PAPER_SCANNING]: ScanLine,
  [Feature.EXCEL_IMPORT]: Upload,
  [Feature.PATIENT_DEDUPLICATION]: Users,
  [Feature.BASIC_PATIENT_MANAGEMENT]: Users,
  [Feature.DOCUMENT_ARCHIVAL]: FileText,
  [Feature.EXPORT_CSV]: Upload,
  [Feature.OCR_BASIC]: ScanLine,

  [Feature.CALENDAR_SLOTS]: Calendar,
  [Feature.VISIT_HISTORY]: FileText,
  [Feature.MEDICINES_LIST]: Package,
  [Feature.INVOICING]: Receipt,
  [Feature.DIGITAL_PRESCRIPTIONS]: FileText,
  [Feature.BASIC_ANALYTICS]: BarChart3,
  [Feature.MEDICAL_CODING]: FileText,

  [Feature.AUTO_REMINDERS]: Calendar,
  [Feature.PAYMENT_LINKS]: Receipt,
  [Feature.PRESCRIPTION_TEMPLATES]: FileText,
  [Feature.MULTI_DEVICE]: Shield,
  [Feature.ROLE_MANAGEMENT]: Users,
  [Feature.CONSENT_MANAGEMENT]: Shield,
  [Feature.DOCTOR_SIGNATURE]: FileText,

  [Feature.MULTI_DOCTOR]: Users,
  [Feature.MULTI_CLINIC]: Building2,
  [Feature.LAB_TESTS]: FlaskConical,
  [Feature.VACCINE_TRACKING]: Syringe,
  [Feature.INVENTORY]: Package,
  [Feature.QUEUE_MANAGEMENT]: Ticket,
  [Feature.AUDIT_LOGS]: Shield,
  [Feature.INSURANCE_BILLING]: Receipt,
  [Feature.DIGITAL_INTAKE_FORMS]: FileText,
  [Feature.BROADCAST_CAMPAIGNS]: MessageSquare,
  [Feature.OCR_ADVANCED]: ScanLine,
  [Feature.ADVANCED_ANALYTICS]: BarChart3,

  [Feature.FULL_EHR]: FileText,
  [Feature.API_ACCESS]: Zap,
  [Feature.MULTI_LOCATION_ANALYTICS]: BarChart3,
  [Feature.CUSTOM_BRANDING]: Building2,
  [Feature.DATA_WAREHOUSE_EXPORT]: Upload,
  [Feature.SSO]: Shield,
  [Feature.BULK_IMPORT_SUITE]: Upload,

  [Feature.AI_PRESCRIPTION_ASSISTANT]: Brain,
  [Feature.AI_DIAGNOSIS_HINTS]: Brain,
  [Feature.SMART_TASK_ENGINE]: Zap,
  [Feature.PREDICTIVE_NO_SHOW]: Calendar,
  [Feature.PATIENT_SEGMENTATION]: Users,
  [Feature.ANOMALY_DETECTION]: Shield,

  [Feature.LEAVE_MANAGEMENT]: CalendarOff,
  [Feature.WHATSAPP_MESSAGING]: MessageSquare,
  [Feature.WHATSAPP_OWN_NUMBER]: MessageSquare,
  [Feature.WHATSAPP_MANAGED_NUMBER]: MessageSquare,
  [Feature.DEDICATED_DEPLOYMENT]: Building2,
  [Feature.WHITE_LABEL_BRANDING]: Sparkles,
  [Feature.LOCKED_CUSTOM_THEME]: Paintbrush,
};

export function getFeatureDetails(feature: Feature) {
  const display = FEATURE_DISPLAY[feature];
  const availability = display?.availability ?? "GA";
  const comingSoon = display?.comingSoon === true;
  return {
    name: display?.name || feature,
    description: display?.description || "",
    availability,
    comingSoon,
    isGenerallyAvailable: availability === "GA" && !comingSoon,
    icon: FEATURE_ICONS[feature] || Lock,
  };
}
