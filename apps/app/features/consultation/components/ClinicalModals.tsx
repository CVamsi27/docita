"use client";

import { Medication, ModalProps, PrescriptionModal } from "./modals/PrescriptionModal";
import { VitalsFormData, VitalsModal } from "./modals/VitalsModal";
import { BillingModal, LineItem } from "./modals/BillingModal";
import { ConsultationNotesModal, ConsultationNotesModalProps } from "./modals/ConsultationNotesModal";

export { PrescriptionModal, VitalsModal, BillingModal, ConsultationNotesModal };

export type {
  ModalProps,
  Medication,
  VitalsFormData,
  LineItem,
  ConsultationNotesModalProps,
};
