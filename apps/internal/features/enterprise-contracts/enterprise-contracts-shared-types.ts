import type { EnterpriseContractsPageState } from "./use-enterprise-contracts-page";

/**
 * Shared state slice for the contract editor dialog and any
 * composable that owns the same editor-side surface.
 *
 * Exported as a single named type so `EnterpriseContractsEditorDialog`
 * and the larger `EnterpriseContractsDialogs` cluster can both
 * pick from the same source without re-listing 9 string keys at
 * each call site.
 */
export type EnterpriseContractsEditorState = Pick<
  EnterpriseContractsPageState,
  | "editorOpen"
  | "setEditorOpen"
  | "editorMode"
  | "form"
  | "setForm"
  | "editingContractId"
  | "applyPreset"
  | "submit"
  | "busy"
>;
