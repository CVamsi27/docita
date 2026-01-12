/**
 * Dialogs Components - UI/Container Pattern
 * Migrated: 6/7 components (PrescriptionAnalysisDialog pending - large complex)
 */

// ============================================================================
// MIGRATED COMPONENTS (UI/Container Pattern)
// ============================================================================

// WhatsAppSettingsDialog
export {
  WhatsAppSettingsDialogUI,
  type WhatsAppSettingsDialogUIProps,
} from "./WhatsAppSettingsDialogUI";
export { WhatsAppSettingsDialogContainer } from "./WhatsAppSettingsDialogContainer";

// WhatsAppBroadcastDialog
export {
  WhatsAppBroadcastDialogUI,
  type WhatsAppBroadcastDialogUIProps,
  type WhatsAppBroadcastFormData,
} from "./WhatsAppBroadcastDialogUI";
export { WhatsAppBroadcastDialogContainer } from "./WhatsAppBroadcastDialogContainer";

// MedicineReminderDialog
export {
  MedicineReminderDialogUI,
  type MedicineReminderDialogUIProps,
  type MedicineReminderFormData,
} from "./MedicineReminderDialogUI";
export { MedicineReminderDialogContainer } from "./MedicineReminderDialogContainer";

// InventoryAddItemDialog
export {
  InventoryAddItemDialogUI,
  type InventoryAddItemDialogUIProps,
  type InventoryItemFormData,
} from "./InventoryAddItemDialogUI";
export { InventoryAddItemDialogContainer } from "./InventoryAddItemDialogContainer";

// ContactSalesModal
export {
  ContactSalesModalUI,
  type ContactSalesModalUIProps,
  type ContactSalesFormData,
} from "./ContactSalesModalUI";
export { ContactSalesModalContainer } from "./ContactSalesModalContainer";

// BulkImportDialog
export {
  BulkImportDialogUI,
  type BulkImportDialogUIProps,
  type EntityType,
  type BulkImportStep,
} from "./BulkImportDialogUI";
export { BulkImportDialogContainer } from "./BulkImportDialogContainer";
