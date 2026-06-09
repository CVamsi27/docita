"use client";

import { Plus } from "lucide-react";
import type { LabContractResponse } from "@workspace/types";
import type { Control, FieldPath } from "react-hook-form";
import type { CreateLabRequest } from "@workspace/types";
import { Button } from "@workspace/ui/components/form/button";
import { Input } from "@workspace/ui/components/form/input";
import { Switch } from "@workspace/ui/components/form/switch";
import {
  FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@workspace/ui/components/form/form";
import { Form } from "@workspace/ui/components/form/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@workspace/ui/components/form/select";
import { StatusBadge } from "@workspace/ui/components/indicators/status-badge";
import { Badge } from "@workspace/ui/components/indicators/badge";
import { DataState } from "@workspace/ui/components/data-display/data-state";
import { DataTable, type DataTableColumn } from "@workspace/ui/components/data-display/data-table";
import {
  Dialog, DialogBody, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from "@workspace/ui/components/overlay/dialog";
import { useLabDirectory } from "@/features/lab-tests/hooks/use-lab-directory";

/* ─── Subcomponents ─────────────────────────────────────────── */

function LabFormInputField({
  control, name, label, placeholder, type,
}: {
  control: Control<CreateLabRequest>;
  name: FieldPath<CreateLabRequest>;
  label: string;
  placeholder: string;
  type?: string;
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input type={type} placeholder={placeholder} {...field} value={field.value ?? ""} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function LabTypeSelectField({ control }: { control: Control<CreateLabRequest> }) {
  return (
    <FormField
      control={control}
      name="type"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Type</FormLabel>
          <Select value={field.value} onValueChange={field.onChange}>
            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
            <SelectContent>
              <SelectItem value="INTERNAL">In-house</SelectItem>
              <SelectItem value="EXTERNAL">External partner</SelectItem>
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function LabDirectoryDialog(hook: ReturnType<typeof useLabDirectory>) {
  return (
    <Dialog open={hook.dialogOpen} onOpenChange={hook.setDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{hook.editing ? "Edit lab" : "Add lab"}</DialogTitle>
          <DialogDescription>
            {hook.editing ? "Update this lab's details." : "Register a lab to route test orders to it."}
          </DialogDescription>
        </DialogHeader>
        <Form {...hook.form}>
          <form onSubmit={hook.form.handleSubmit(hook.onSubmit)} noValidate>
            <DialogBody className="space-y-4">
              <LabFormInputField control={hook.form.control} name="name" label="Name" placeholder="Lab name" />
              <LabTypeSelectField control={hook.form.control} />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <LabFormInputField control={hook.form.control} name="phone" label="Phone (optional)" placeholder="Phone" />
                <LabFormInputField control={hook.form.control} name="email" label="Email (optional)" placeholder="Email" type="email" />
              </div>
              <LabFormInputField control={hook.form.control} name="address" label="Address (optional)" placeholder="Address" />
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => hook.setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={hook.isSaving}>{hook.editing ? "Save" : "Add Lab"}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function LabActionsCell({
  lab, toggleActive, openEdit,
}: {
  lab: LabContractResponse;
  toggleActive: (lab: LabContractResponse) => void;
  openEdit: (lab: LabContractResponse) => void;
}) {
  return (
    <div className="flex items-center justify-end gap-3">
      <div className="flex items-center gap-2">
        <Switch checked={lab.active} onCheckedChange={() => toggleActive(lab)}
          aria-label={lab.active ? "Deactivate lab" : "Activate lab"} />
        <span className="text-xs text-muted-foreground">Active</span>
      </div>
      <Button size="sm" variant="outline" onClick={() => openEdit(lab)}>Edit</Button>
    </div>
  );
}

function LabNameCell({ lab }: { lab: LabContractResponse }) {
  return (
    <div className="flex items-center gap-2">
      <span className="font-medium">{lab.name}</span>
      <Badge variant={lab.type === "EXTERNAL" ? "secondary" : "outline"}>
        {lab.type === "EXTERNAL" ? "External" : "In-house"}
      </Badge>
    </div>
  );
}

/* ─── Main component ────────────────────────────────────────── */

export function LabDirectorySettings() {
  const hook = useLabDirectory();

  const columns: DataTableColumn<LabContractResponse>[] = [
    { id: "name", header: "Lab", cell: (lab) => <LabNameCell lab={lab} /> },
    { id: "contact", header: "Contact", hiddenOnMobile: true, cell: (lab) => (
      <span className="text-sm text-muted-foreground">{lab.phone || lab.email || "—"}</span>
    ) },
    { id: "status", header: "Status", cell: (lab) => <StatusBadge status={lab.active ? "active" : "inactive"} /> },
    { id: "actions", header: "Actions", align: "right", cell: (lab) => (
      <LabActionsCell lab={lab} toggleActive={hook.toggleActive} openEdit={hook.openEdit} />
    ) },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Labs</h3>
          <p className="text-sm text-muted-foreground">Manage in-house and external labs that fulfil test orders.</p>
        </div>
        <Button className="gap-2" onClick={hook.openCreate}>
          <Plus className="h-4 w-4" />Add Lab
        </Button>
      </div>
      <DataState status={hook.status} loadingMessage="Loading labs…" emptyTitle="No labs yet"
        emptyDescription="Add an in-house or external lab to route test orders to it."
        emptyAction={{ label: "Add Lab", onClick: hook.openCreate }} onRetry={() => hook.refetch()}>
        <DataTable data={hook.labs} columns={columns} rowKey={(lab) => lab.id} />
      </DataState>
      <LabDirectoryDialog {...hook} />
    </div>
  );
}
