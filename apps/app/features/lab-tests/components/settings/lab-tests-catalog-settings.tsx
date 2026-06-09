"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import type { Control, FieldPath } from "react-hook-form";
import type { CreateLabTestRequest, LabTest } from "@workspace/types";
import { Button } from "@workspace/ui/components/form/button";
import { Input } from "@workspace/ui/components/form/input";
import { Switch } from "@workspace/ui/components/form/switch";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form/form";
import { Form } from "@workspace/ui/components/form/form";
import { DataState } from "@workspace/ui/components/data-display/data-state";
import { DataTable, type DataTableColumn } from "@workspace/ui/components/data-display/data-table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/overlay/dialog";
import { ConfirmationDialog } from "@workspace/ui/components/overlay/confirmation-dialog";
import { useLabTestCatalogSettings } from "@/features/lab-tests/hooks/use-lab-test-catalog-settings";
import { useClinicCurrency } from "@/hooks/use-clinic-currency";
import { SuggestedTestsCombobox } from "./suggested-tests-combobox";

/* ─── Subcomponents ─────────────────────────────────────────── */

function TestFormTextField({
  control,
  name,
  label,
  placeholder,
  type,
}: {
  control: Control<CreateLabTestRequest>;
  name: FieldPath<CreateLabTestRequest>;
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
            <Input
              type={type}
              placeholder={placeholder}
              {...field}
              value={field.value != null ? String(field.value) : ""}
              onChange={(e) => {
                const raw = e.target.value;
                if (type === "number") {
                  const n = parseFloat(raw);
                  field.onChange(isNaN(n) ? undefined : n);
                } else {
                  field.onChange(raw);
                }
              }}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function TestActiveToggle({
  control,
}: {
  control: Control<CreateLabTestRequest>;
}) {
  return (
    <FormField
      control={control}
      name="active"
      render={({ field }) => (
        <FormItem className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <FormLabel>Active</FormLabel>
          </div>
          <FormControl>
            <Switch
              checked={field.value ?? true}
              onCheckedChange={field.onChange}
            />
          </FormControl>
        </FormItem>
      )}
    />
  );
}

/* ─── Dialog ─────────────────────────────────────────────────── */

function TestCatalogDialog(
  hook: ReturnType<typeof useLabTestCatalogSettings>,
) {
  const { catalog, editing } = hook;

  return (
    <Dialog open={hook.dialogOpen} onOpenChange={hook.setDialogOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit test" : "Add test to catalog"}</DialogTitle>
          <DialogDescription>
            {editing
              ? "Update the details for this lab test."
              : "Add a new lab test to the clinic catalog. Suggested tests from existing entries are shown below."}
          </DialogDescription>
        </DialogHeader>
        <Form {...hook.form}>
          <form onSubmit={hook.form.handleSubmit(hook.onSubmit)}>
            <DialogBody className="space-y-4">
              {!editing && catalog.length > 0 && (
                <SuggestedTestsCombobox
                  catalog={catalog}
                  onSelect={(t) => {
                    hook.form.setValue("name", t.name);
                    hook.form.setValue("category", t.category);
                    if (t.code) hook.form.setValue("code", t.code);
                    if (t.price) hook.form.setValue("price", t.price);
                    if (t.description) hook.form.setValue("description", t.description);
                  }}
                />
              )}
              <TestFormTextField
                control={hook.form.control}
                name="name"
                label="Name"
                placeholder="e.g. Complete Blood Count"
              />
              <TestFormTextField
                control={hook.form.control}
                name="category"
                label="Category"
                placeholder="e.g. haematology"
              />
              <div className="grid grid-cols-2 gap-4">
                <TestFormTextField
                  control={hook.form.control}
                  name="code"
                  label="Code (optional)"
                  placeholder="e.g. CBC"
                />
                <TestFormTextField
                  control={hook.form.control}
                  name="price"
                  label="Price (optional)"
                  placeholder="0"
                  type="number"
                />
              </div>
              <TestFormTextField
                control={hook.form.control}
                name="description"
                label="Description (optional)"
                placeholder="Short description"
              />
              <TestActiveToggle control={hook.form.control} />
            </DialogBody>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => hook.setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={hook.isSaving}>
                {hook.isSaving ? "Saving…" : editing ? "Save changes" : "Add test"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Delete confirmation ─────────────────────────────────────── */

function DeleteTestConfirmation(
  hook: ReturnType<typeof useLabTestCatalogSettings>,
) {
  return (
    <ConfirmationDialog
      open={hook.deleteTargetId !== null}
      onOpenChange={(open) => {
        if (!open) hook.cancelDelete();
      }}
      type="danger"
      title="Remove test from catalog?"
      description="This test will no longer appear when ordering new lab tests. Existing orders referencing this test are not affected."
      confirmText="Remove"
      cancelText="Cancel"
      onConfirm={hook.executeDelete}
      onCancel={hook.cancelDelete}
      isLoading={hook.isDeleting}
    />
  );
}

/* ─── Main component ─────────────────────────────────────────── */

export function LabTestsCatalogSettings() {
  const hook = useLabTestCatalogSettings();
  const { formatCurrency } = useClinicCurrency();

  const columns: DataTableColumn<LabTest>[] = [
    {
      id: "name",
      header: "Name",
      cell: (t) => <span className="font-medium">{t.name}</span>,
    },
    {
      id: "category",
      header: "Category",
      hiddenOnMobile: true,
      cell: (t) => (
        <span className="capitalize text-muted-foreground">{t.category}</span>
      ),
    },
    {
      id: "price",
      header: "Price",
      hiddenOnMobile: true,
      cell: (t) => (
        <span className="tabular-nums">
          {t.price ? formatCurrency(t.price, { fractionDigits: 0 }) : "—"}
        </span>
      ),
    },
    {
      id: "active",
      header: "Active",
      hiddenOnMobile: true,
      cell: (t) => (
        <span
          className={
            t.active
              ? "text-success text-sm"
              : "text-muted-foreground text-sm"
          }
        >
          {t.active ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: (t) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={() => hook.openEdit(t)}
            aria-label={`Edit ${t.name}`}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={() => hook.confirmDelete(t.id)}
            aria-label={`Remove ${t.name}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle>Test Catalog</CardTitle>
            <CardDescription>
              Manage the lab tests available for ordering at this clinic.
            </CardDescription>
          </div>
          <Button size="sm" className="gap-1.5 shrink-0" onClick={hook.openCreate}>
            <Plus className="h-4 w-4" />
            Add test
          </Button>
        </CardHeader>
        <CardContent>
          <DataState
            status={hook.status}
            onRetry={hook.refetch}
            emptyTitle="No tests in catalog"
            emptyDescription="Add tests that your clinic offers so staff can quickly order them."
          >
            <DataTable<LabTest>
              columns={columns}
              data={hook.catalog}
              rowKey={(t) => t.id}
            />
          </DataState>
        </CardContent>
      </Card>

      <TestCatalogDialog {...hook} />
      <DeleteTestConfirmation {...hook} />
    </>
  );
}
