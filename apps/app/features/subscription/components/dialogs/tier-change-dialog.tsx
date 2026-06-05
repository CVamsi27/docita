"use client";

import { type TierChangeDialogProps } from "./tier-change-dialog-types";
import { useTierChangeDialog } from "./use-tier-change-dialog";
import { TierChangeDialogView } from "./tier-change-dialog-view";

export type { TierChangeDialogProps } from "./tier-change-dialog-types";

export function TierChangeDialog(props: TierChangeDialogProps) {
  const dialog = useTierChangeDialog(props);
  return props.selectedTier ? (
    <TierChangeDialogView props={props} dialog={dialog} />
  ) : null;
}
