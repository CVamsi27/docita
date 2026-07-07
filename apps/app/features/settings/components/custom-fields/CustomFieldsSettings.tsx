"use client";

/* jscpd:ignore-start — this settings panel is a deliberate, thin mirror of the
   lab-tests catalog settings CRUD pattern (imports of the same @workspace/ui
   primitives, ConfirmationDialog + DataTable render, delete-confirmation
   wrapper). Per lab-tests-catalog-settings.tsx, forcing a shared abstraction
   would couple two unrelated settings panels, so the shape is duplicated by
   design. */
import { Pencil, Plus, Trash2 } from "lucide-react";
import { customFieldTypeSchema, type CustomField } from "@workspace/types";
import { Button } from "@workspace/ui/components/form/button";
import { Input } from "@workspace/ui/components/form/input";
import { Switch } from "@workspace/ui/components/form/switch";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/form/select";
import { DataState } from "@workspace/ui/components/data-display/data-state";
import {
  DataTable,
  type DataTableColumn,
} from "@workspace/ui/components/data-display/data-table";
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
import { useCustomFieldsSettings } from "@/features/settings/hooks/use-custom-fields-settings";

const CUSTOM_FIELD_TYPES = customFieldTypeSchema.options;

const FIELD_TYPE_LABELS: Record<string, string> = {
  text: "Text",
  number: "Number",
  select: "Dropdown",
  date: "Date",
  checkbox: "Yes / No",
  textarea: "Long text",
};

/* ─── Dialog ─────────────────────────────────────────────────── */

function CustomFieldDialog(hook: ReturnType<typeof useCustomFieldsSettings>) {
  const { editing } = hook;
  const fieldType = hook.form.watch("fieldType");

  return (
    <Dialog open={hook.dialogOpen} onOpenChange={hook.setDialogOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Edit custom field" : "Add custom field"}
          </DialogTitle>
          <DialogDescription>
            {editing
              ? "Update this custom field definition."
              : "Define an extra field to capture on patient records."}
          </DialogDescription>
        </DialogHeader>
        <Form {...hook.form}>
          <form onSubmit={hook.form.handleSubmit(hook.onSubmit)}>
            <DialogBody className="space-y-4">
              <FormField
                control={hook.form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Field name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. Referring doctor"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={hook.form.control}
                name="fieldType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Field type</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CUSTOM_FIELD_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {FIELD_TYPE_LABELS[type] ?? type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {fieldType === "select" && (
                <FormField
                  control={hook.form.control}
                  name="options"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dropdown options</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Comma-separated, e.g. Low, Medium, High"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormDescription>
                        Separate each choice with a comma.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <FormField
                control={hook.form.control}
                name="required"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <FormLabel>Required</FormLabel>
                      <FormDescription>
                        Staff must fill this in before saving.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value ?? false}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
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
                {hook.isSaving
                  ? "Saving…"
                  : editing
                    ? "Save changes"
                    : "Add field"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Delete confirmation ─────────────────────────────────────── */

function DeleteCustomFieldConfirmation(
  hook: ReturnType<typeof useCustomFieldsSettings>,
) {
  return (
    <ConfirmationDialog
      open={hook.deleteTargetId !== null}
      onOpenChange={(open) => {
        if (!open) hook.cancelDelete();
      }}
      type="danger"
      title="Remove custom field?"
      description="This field will no longer be captured on new patient records. Existing values are not deleted."
      confirmText="Remove"
      cancelText="Cancel"
      onConfirm={hook.executeDelete}
      onCancel={hook.cancelDelete}
      isLoading={hook.isDeleting}
    />
  );
}

/* ─── Main component ─────────────────────────────────────────── */

export function CustomFieldsSettings() {
  const hook = useCustomFieldsSettings();

  const columns: DataTableColumn<CustomField>[] = [
    {
      id: "name",
      header: "Name",
      cell: (f) => <span className="font-medium">{f.name}</span>,
    },
    {
      id: "fieldType",
      header: "Type",
      hiddenOnMobile: true,
      cell: (f) => (
        <span className="text-muted-foreground">
          {FIELD_TYPE_LABELS[f.fieldType] ?? f.fieldType}
        </span>
      ),
    },
    {
      id: "required",
      header: "Required",
      hiddenOnMobile: true,
      cell: (f) => (
        <span className="text-muted-foreground text-sm">
          {f.required ? "Required" : "Optional"}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: (f) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={() => hook.openEdit(f)}
            aria-label={`Edit ${f.name}`}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={() => hook.confirmDelete(f.id)}
            aria-label={`Remove ${f.name}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-4xl">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle>Custom Fields</CardTitle>
            <CardDescription>
              Capture extra information on patient records specific to your
              clinic.
            </CardDescription>
          </div>
          <Button
            size="sm"
            className="gap-1.5 shrink-0"
            onClick={hook.openCreate}
          >
            <Plus className="h-4 w-4" />
            Add field
          </Button>
        </CardHeader>
        <CardContent>
          <DataState
            status={hook.status}
            onRetry={hook.refetch}
            emptyTitle="No custom fields yet"
            emptyDescription="Add fields to capture information beyond the standard patient record."
          >
            <DataTable<CustomField>
              columns={columns}
              data={hook.fields}
              rowKey={(f) => f.id}
            />
          </DataState>
        </CardContent>
      </Card>

      <CustomFieldDialog {...hook} />
      <DeleteCustomFieldConfirmation {...hook} />
    </div>
  );
}
/* jscpd:ignore-end */
