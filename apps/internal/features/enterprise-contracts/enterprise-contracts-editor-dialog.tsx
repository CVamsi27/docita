"use client";

import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@workspace/ui/components";
import { EnterpriseContractsEditorForm } from "./enterprise-contracts-editor-form";
import type { EnterpriseContractsEditorState } from "./enterprise-contracts-shared-types";

type EnterpriseContractsEditorDialogProps = EnterpriseContractsEditorState;

export function EnterpriseContractsEditorDialog({
  editorOpen,
  setEditorOpen,
  editorMode,
  form,
  setForm,
  editingContractId,
  applyPreset,
  submit,
  busy,
}: EnterpriseContractsEditorDialogProps) {
  return (
    <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {editorMode === "create" ? "New" : "Edit"} enterprise contract
            {editingContractId ? (
              <span className="ml-2 font-mono text-xs text-muted-foreground">
                {editingContractId}
              </span>
            ) : null}
          </DialogTitle>
          <DialogDescription>
            All money fields in {form.currency}. Group contracts: set groupName and
            add member clinics from the Members dialog after saving.
          </DialogDescription>
        </DialogHeader>

        <EnterpriseContractsEditorForm
          form={form}
          setForm={setForm}
          editorMode={editorMode}
          applyPreset={applyPreset}
        />

        <DialogFooter>
          <Button variant="outline" onClick={() => setEditorOpen(false)}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={busy}>
            {busy ? "Saving…" : editorMode === "create" ? "Create" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
