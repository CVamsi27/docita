"use client";

/* jscpd:ignore-start — this settings panel is a deliberate, thin mirror of the
   lab-tests catalog settings CRUD pattern (imports of the same @workspace/ui
   primitives, ConfirmationDialog + DataTable render, delete-confirmation
   wrapper). Per lab-tests-catalog-settings.tsx, forcing a shared abstraction
   would couple two unrelated settings panels, so the shape is duplicated by
   design. */
import { Pencil, Plus, Trash2 } from "lucide-react";
import { customFieldTypeSchema, type CustomField } from "@workspace/types";
import { useTranslations } from "next-intl";
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

/**
 * Phase 3 (per-feature): apps/app Settings > custom fields.
 * 5 literals converted to useTranslations("Settings.CustomFields").
 */
function useCustomFieldsSettingsTranslations() {
  return useTranslations("Settings.CustomFields");
}

/* ─── Dialog ─────────────────────────────────────────────────── */

function CustomFieldDialog(hook: ReturnType<typeof useCustomFieldsSettings>) {
  const t = useCustomFieldsSettingsTranslations();
  const { editing } = hook;
  const fieldType = hook.form.watch("fieldType");

  return (
    <Dialog open={hook.dialogOpen} onOpenChange={hook.setDialogOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editing ? t("editDialogTitle") : t("addDialogTitle")}
          </DialogTitle>
          <DialogDescription>
            {editing
              ? t("editDialogDescription")
              : t("addDialogDescription")}
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
                    <FormLabel>{t("fieldNameLabel")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t("fieldNamePlaceholder")}
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
                    <FormLabel>{t("fieldTypeLabel")}</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("fieldTypePlaceholder")} />
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
                      <FormLabel>{t("optionsLabel")}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t("optionsPlaceholder")}
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormDescription>
                        {t("optionsDescription")}
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
                      <FormLabel>{t("requiredLabel")}</FormLabel>
                      <FormDescription>
                        {t("requiredDescription")}
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
                {t("cancelButton")}
              </Button>
              <Button type="submit" disabled={hook.isSaving}>
                {hook.isSaving
                  ? t("savingButton")
                  : editing
                    ? t("saveChangesButton")
                    : t("addFieldButton")}
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
  const t = useCustomFieldsSettingsTranslations();
  return (
    <ConfirmationDialog
      open={hook.deleteTargetId !== null}
      onOpenChange={(open) => {
        if (!open) hook.cancelDelete();
      }}
      type="danger"
      title={t("deleteConfirmTitle")}
      description={t("deleteConfirmDescription")}
      confirmText={t("deleteConfirmButton")}
      cancelText={t("cancelButton")}
      onConfirm={hook.executeDelete}
      onCancel={hook.cancelDelete}
      isLoading={hook.isDeleting}
    />
  );
}

/* ─── Main component ─────────────────────────────────────────── */

export function CustomFieldsSettings() {
  const t = useCustomFieldsSettingsTranslations();
  const hook = useCustomFieldsSettings();

  const columns: DataTableColumn<CustomField>[] = [
    {
      id: "name",
      header: t("nameColumn"),
      cell: (f) => <span className="font-medium">{f.name}</span>,
    },
    {
      id: "fieldType",
      header: t("typeColumn"),
      hiddenOnMobile: true,
      cell: (f) => (
        <span className="text-muted-foreground">
          {FIELD_TYPE_LABELS[f.fieldType] ?? f.fieldType}
        </span>
      ),
    },
    {
      id: "required",
      header: t("requiredColumn"),
      hiddenOnMobile: true,
      cell: (f) => (
        <span className="text-muted-foreground text-sm">
          {f.required ? t("requiredCell") : t("optionalCell")}
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
            aria-label={t("editAriaLabel", { name: f.name })}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={() => hook.confirmDelete(f.id)}
            aria-label={t("removeAriaLabel", { name: f.name })}
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
            <CardTitle>{t("title")}</CardTitle>
            <CardDescription>
              {t("description")}
            </CardDescription>
          </div>
          <Button
            size="sm"
            className="gap-1.5 shrink-0"
            onClick={hook.openCreate}
          >
            <Plus className="h-4 w-4" />
            {t("addFieldButton")}
          </Button>
        </CardHeader>
        <CardContent>
          <DataState
            status={hook.status}
            onRetry={hook.refetch}
            emptyTitle={t("emptyTitle")}
            emptyDescription={t("emptyDescription")}
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
