import { z } from "zod";
import { Feature } from "./tier";

export const featureDisplaySchema = z.object({
  name: z.string(),
  description: z.string(),
  availability: z.enum(["GA", "PLANNED"]).optional(),
  comingSoon: z.boolean().optional(),
});
export type FeatureDisplay = z.infer<typeof featureDisplaySchema>;

export const FEATURE_DISPLAY: Record<Feature, FeatureDisplay> = {
  [Feature.PAPER_SCANNING]: {
    name: "Paper Scanning",
    description: "Scan documents with your camera",
  },
  [Feature.EXCEL_IMPORT]: {
    name: "Excel Import",
    description: "Import patient data from Excel/CSV",
  },
  [Feature.PATIENT_DEDUPLICATION]: {
    name: "Patient Deduplication",
    description: "Automatic duplicate detection",
  },
  [Feature.BASIC_PATIENT_MANAGEMENT]: {
    name: "Patient Management",
    description: "Basic patient records",
  },
  [Feature.DOCUMENT_ARCHIVAL]: {
    name: "Document Archival",
    description: "Store and organize documents",
  },
  [Feature.EXPORT_CSV]: {
    name: "CSV Export",
    description: "Export data to CSV",
  },
  [Feature.OCR_BASIC]: {
    name: "Basic OCR",
    description: "Extract text from images",
  },
  [Feature.CALENDAR_SLOTS]: {
    name: "Consultations",
    description: "Schedule and manage consultations",
  },
  [Feature.VISIT_HISTORY]: {
    name: "Visit History",
    description: "Track patient visit history",
  },
  [Feature.MEDICINES_LIST]: {
    name: "Medicine Database",
    description: "Search and add medicines",
  },
  [Feature.DIGITAL_PRESCRIPTIONS]: {
    name: "Digital Prescriptions",
    description: "Create digital prescriptions",
  },

  [Feature.INVOICING]: {
    name: "Invoicing",
    description: "Create and manage invoices",
  },
  [Feature.BASIC_ANALYTICS]: {
    name: "Basic Analytics",
    description: "View clinic statistics",
  },
  [Feature.MEDICAL_CODING]: {
    name: "Medical Coding",
    description: "ICD/CPT code management",
  },
  [Feature.AUTO_REMINDERS]: {
    name: "Auto Reminders",
    description: "Automated appointment reminders",
  },
  [Feature.PAYMENT_LINKS]: {
    name: "Payment Links",
    description: "Send payment links via WhatsApp",
  },
  [Feature.PRESCRIPTION_TEMPLATES]: {
    name: "Prescription Templates",
    description: "Reusable prescription templates",
  },
  [Feature.MULTI_DEVICE]: {
    name: "Multi-Device Login",
    description: "Staff can log in from multiple devices",
  },
  [Feature.ROLE_MANAGEMENT]: {
    name: "Role Management",
    description: "Assign roles to staff members",
  },
  [Feature.CONSENT_MANAGEMENT]: {
    name: "Consent Management",
    description: "Digital patient consent forms",
  },
  [Feature.DOCTOR_SIGNATURE]: {
    name: "Doctor Signature",
    description: "Digital signature on prescriptions",
  },
  [Feature.LEAVE_MANAGEMENT]: {
    name: "Leave Management",
    description: "Track and manage staff leave",
  },
  [Feature.WHATSAPP_MESSAGING]: {
    name: "WhatsApp Messaging",
    description: "Send messages and reminders via WhatsApp",
  },
  [Feature.WHATSAPP_OWN_NUMBER]: {
    name: "Own WhatsApp Number",
    description: "Send clinic WhatsApp messages from a verified clinic number",
  },
  [Feature.WHATSAPP_MANAGED_NUMBER]: {
    name: "Managed WhatsApp Number",
    description: "Docita-assisted WhatsApp sender onboarding",
  },

  [Feature.MULTI_DOCTOR]: {
    name: "Multi-Doctor",
    description: "Manage multiple doctors",
  },
  [Feature.MULTI_CLINIC]: {
    name: "Multi-Branch",
    description: "Manage multiple clinic branches",
    availability: "PLANNED",
  },
  [Feature.LAB_TESTS]: {
    name: "Lab Tests",
    description: "Lab test catalog and tracking",
  },
  [Feature.INVENTORY]: {
    name: "Inventory",
    description: "Medicine and supplies inventory",
  },
  [Feature.QUEUE_MANAGEMENT]: {
    name: "Queue Management",
    description: "Token queue system",
  },
  [Feature.AUDIT_LOGS]: {
    name: "Audit Logs",
    description: "Complete audit trail",
  },
  [Feature.INSURANCE_BILLING]: {
    name: "Insurance Billing",
    description: "Insurance claim management",
    availability: "PLANNED",
  },
  [Feature.DIGITAL_INTAKE_FORMS]: {
    name: "Digital Intake Forms",
    description: "Patient intake forms online",
    availability: "PLANNED",
  },
  [Feature.BROADCAST_CAMPAIGNS]: {
    name: "Broadcast Campaigns",
    description: "WhatsApp bulk messaging",
    availability: "PLANNED",
  },
  [Feature.OCR_ADVANCED]: {
    name: "Advanced OCR",
    description: "AI-powered document extraction",
  },
  [Feature.ADVANCED_ANALYTICS]: {
    name: "Advanced Analytics",
    description: "Deep clinic performance analytics",
  },

  [Feature.FULL_EHR]: {
    name: "Full EHR",
    description: "Complete electronic health records",
    availability: "PLANNED",
  },
  [Feature.API_ACCESS]: {
    name: "API Access",
    description: "REST API for integrations",
    availability: "PLANNED",
  },
  [Feature.MULTI_LOCATION_ANALYTICS]: {
    name: "Multi-Location Analytics",
    description: "Analytics across all branches",
    availability: "PLANNED",
  },
  [Feature.CUSTOM_BRANDING]: {
    name: "Custom Branding",
    description: "White-label with your brand",
    availability: "PLANNED",
  },
  [Feature.WHITE_LABEL_BRANDING]: {
    name: "White-Label Branding",
    description: "Replace Docita with your clinic name throughout the app",
  },
  [Feature.LOCKED_CUSTOM_THEME]: {
    name: "Locked Custom Theme",
    description: "Set and enforce a theme, colour, and layout for all users",
  },
  [Feature.DATA_WAREHOUSE_EXPORT]: {
    name: "Data Warehouse Export",
    description: "Export to data warehouse",
    availability: "PLANNED",
  },
  [Feature.DEDICATED_DEPLOYMENT]: {
    name: "Dedicated Deployment",
    description: "Dedicated infrastructure and deployment support",
    availability: "PLANNED",
  },
  [Feature.SSO]: {
    name: "Single Sign-On",
    description: "Enterprise SSO integration",
    availability: "PLANNED",
  },
  [Feature.BULK_IMPORT_SUITE]: {
    name: "Bulk Import Suite",
    description: "Advanced bulk data import",
    availability: "PLANNED",
  },

  [Feature.AI_PRESCRIPTION_ASSISTANT]: {
    name: "AI Prescription Assistant",
    description: "AI-powered prescription suggestions",
    availability: "PLANNED",
    comingSoon: true,
  },
  [Feature.AI_DIAGNOSIS_HINTS]: {
    name: "AI Diagnosis Hints",
    description: "AI-powered diagnosis suggestions",
    availability: "PLANNED",
    comingSoon: true,
  },
  [Feature.SMART_TASK_ENGINE]: {
    name: "Smart Tasks",
    description: "AI-powered task automation",
    availability: "PLANNED",
    comingSoon: true,
  },
  [Feature.PREDICTIVE_NO_SHOW]: {
    name: "No-Show Prediction",
    description: "Predict appointment no-shows",
    availability: "PLANNED",
    comingSoon: true,
  },
  [Feature.PATIENT_SEGMENTATION]: {
    name: "Patient Segmentation",
    description: "AI-powered patient grouping",
    availability: "PLANNED",
    comingSoon: true,
  },
  [Feature.ANOMALY_DETECTION]: {
    name: "Anomaly Detection",
    description: "Detect unusual patterns",
    availability: "PLANNED",
    comingSoon: true,
  },
};

