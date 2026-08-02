import { useTranslation } from "react-i18next";
import { Pencil, Plus, Trash2 } from "lucide-react";
import type { Control, FieldPath } from "react-hook-form";
import type { CreateLabTestRequest, LabTest } from "@workspace/types";
import { FormControl, FormField, FormItem, FormLabel, FormMessage, Input } from "@workspace/ui/components/form/form-primitives";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, DataState, DataTable, Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Form, Switch, type DataTableColumn } from "@workspace/ui/components";
import { ConfirmationDialog } from "@workspace/ui/components/overlay/confirmation-dialog";
import { useLabTestCatalogSettings } from "@/features/lab-tests/hooks/use-lab-test-catalog-settings";
import { useLocaleCurrency } from "@/hooks/use-locale-currency";
import { formatCurrency as formatCurrencyUtil } from "@/lib/formatters";
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
  const { t } = useTranslation("LabTests");
  return (
    <FormField
      control={control}
      name="active"
      render={({ field }) => (
        <FormItem className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <FormLabel>{t("catalogSettings.activeLabel")}</FormLabel>
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
  const { t } = useTranslation("LabTests");
  const { catalog, editing } = hook;

  return (
    <Dialog open={hook.dialogOpen} onOpenChange={hook.setDialogOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? t("catalogSettings.editTitle") : t("catalogSettings.addTitle")}</DialogTitle>
          <DialogDescription>
            {editing
              ? t("catalogSettings.editDescription")
              : t("catalogSettings.addDescription")}
          </DialogDescription>
        </DialogHeader>
        <Form {...hook.form}>
          <form onSubmit={hook.form.handleSubmit(hook.onSubmit)}>
            <DialogBody className="space-y-4">
              {!editing && catalog.length > 0 && (
                <SuggestedTestsCombobox
                  catalog={catalog}
                  onSelect={(test) => {
                    hook.form.setValue("name", test.name);
                    hook.form.setValue("category", test.category);
                    if (test.code) hook.form.setValue("code", test.code);
                    if (test.price) hook.form.setValue("price", test.price);
                    if (test.description) hook.form.setValue("description", test.description);
                  }}
                />
              )}
              <TestFormTextField
                control={hook.form.control}
                name="name"
                label={t("catalogSettings.nameLabel")}
                placeholder={t("catalogSettings.namePlaceholder")}
              />
              <TestFormTextField
                control={hook.form.control}
                name="category"
                label={t("catalogSettings.categoryLabel")}
                placeholder={t("catalogSettings.categoryPlaceholder")}
              />
              <div className="grid grid-cols-2 gap-4">
                <TestFormTextField
                  control={hook.form.control}
                  name="code"
                  label={t("catalogSettings.codeLabel")}
                  placeholder={t("catalogSettings.codePlaceholder")}
                />
                <TestFormTextField
                  control={hook.form.control}
                  name="price"
                  label={t("catalogSettings.priceLabel")}
                  placeholder="0"
                  type="number"
                />
              </div>
              <TestFormTextField
                control={hook.form.control}
                name="description"
                label={t("catalogSettings.descriptionLabel")}
                placeholder={t("catalogSettings.descriptionPlaceholder")}
              />
              <TestActiveToggle control={hook.form.control} />
            </DialogBody>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => hook.setDialogOpen(false)}
              >
                {t("catalogSettings.cancelButton")}
              </Button>
              <Button type="submit" disabled={hook.isSaving}>
                {hook.isSaving ? t("catalogSettings.savingButton") : editing ? t("catalogSettings.saveButton") : t("catalogSettings.addButton")}
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
  const { t } = useTranslation("LabTests");
  return (
    <ConfirmationDialog
      open={hook.deleteTargetId !== null}
      onOpenChange={(open) => {
        if (!open) hook.cancelDelete();
      }}
      type="danger"
      title={t("catalogSettings.deleteTitle")}
      description={t("catalogSettings.deleteDescription")}
      confirmText={t("catalogSettings.deleteConfirmButton")}
      cancelText={t("catalogSettings.cancelButton")}
      onConfirm={hook.executeDelete}
      onCancel={hook.cancelDelete}
      isLoading={hook.isDeleting}
    />
  );
}

/* ─── Main component ─────────────────────────────────────────── */

export function LabTestsCatalogSettings() {
  const { t } = useTranslation("LabTests");
  const hook = useLabTestCatalogSettings();
  const { currency } = useLocaleCurrency();
  const formatCurrency = (amount: number, options?: { fractionDigits?: number }) =>
    formatCurrencyUtil(amount, currency, options ?? {});

  const columns: DataTableColumn<LabTest>[] = [
    {
      id: "name",
      header: t("catalogSettings.nameColumn"),
      cell: (test) => <span className="font-medium">{test.name}</span>,
    },
    {
      id: "category",
      header: t("catalogSettings.categoryColumn"),
      hiddenOnMobile: true,
      cell: (test) => (
        <span className="capitalize text-muted-foreground">{test.category}</span>
      ),
    },
    {
      id: "price",
      header: t("catalogSettings.priceColumn"),
      hiddenOnMobile: true,
      cell: (test) => (
        <span className="tabular-nums">
          {test.price ? formatCurrency(test.price, { fractionDigits: 0 }) : "—"}
        </span>
      ),
    },
    {
      id: "active",
      header: t("catalogSettings.activeColumn"),
      hiddenOnMobile: true,
      cell: (test) => (
        <span
          className={
            test.active
              ? "text-success text-sm"
              : "text-muted-foreground text-sm"
          }
        >
          {test.active ? t("catalogSettings.activeCell") : t("catalogSettings.inactiveCell")}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: (test) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={() => hook.openEdit(test)}
            aria-label={t("catalogSettings.editAriaLabel", { name: test.name })}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={() => hook.confirmDelete(test.id)}
            aria-label={t("catalogSettings.removeAriaLabel", { name: test.name })}
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
            <CardTitle>{t("catalogSettings.title")}</CardTitle>
            <CardDescription>
              {t("catalogSettings.description")}
            </CardDescription>
          </div>
          <Button size="sm" className="gap-1.5 shrink-0" onClick={hook.openCreate}>
            <Plus className="h-4 w-4" />
            {t("catalogSettings.addButton")}
          </Button>
        </CardHeader>
        <CardContent>
          <DataState
            status={hook.status}
            onRetry={hook.refetch}
            emptyTitle={t("catalogSettings.emptyTitle")}
            emptyDescription={t("catalogSettings.emptyDescription")}
          >
            <DataTable<LabTest>
              columns={columns}
              data={hook.catalog}
              rowKey={(test) => test.id}
            />
          </DataState>
        </CardContent>
      </Card>

      <TestCatalogDialog {...hook} />
      <DeleteTestConfirmation {...hook} />
    </>
  );
}
