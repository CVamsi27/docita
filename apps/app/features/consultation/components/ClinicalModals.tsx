"use client";

import {
  PrescriptionModal,
  ModalProps,
  Medication,
} from "./modals/PrescriptionModal";
import { VitalsModal, VitalsFormData } from "./modals/VitalsModal";
import { BillingModal, LineItem } from "./modals/BillingModal";
import {
  ConsultationNotesModal,
  ConsultationNotesModalProps,
} from "./modals/ConsultationNotesModal";

export { PrescriptionModal, VitalsModal, BillingModal, ConsultationNotesModal };

export type {
  ModalProps,
  Medication,
  VitalsFormData,
  LineItem,
  ConsultationNotesModalProps,
};
