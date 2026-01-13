// Consultation Components - Container/UI Pattern
// Migrated: 6 components

// ConsultationTimer
export { ConsultationTimerUI } from "./ConsultationTimerUI";
export { ConsultationTimerContainer } from "./ConsultationTimerContainer";

// ConsultationProgress
export { ConsultationProgressUI } from "./ConsultationProgressUI";
export type { ConsultationStep } from "./ConsultationProgressUI";

// ConsultationModal
export { ConsultationModalContainer } from "./ConsultationModalContainer";

// Clinical Modals (API-connected)
export {
  PrescriptionModal,
  VitalsModal,
  BillingModal,
  ConsultationNotesModal,
  type ModalProps,
  type Medication,
  type VitalsFormData,
  type LineItem,
} from "./ClinicalModals";

export { ConsultationSidebarUI } from "./ConsultationSidebarUI";

// Dynamic Consultation Components
export {
  ClinicalDocumentationDynamic,
  ClinicalExaminationDynamic,
} from "./ConsultationDynamic";
