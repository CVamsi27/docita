"use client";

import { Plus } from "lucide-react";
import type { LabContractResponse } from "@workspace/types";
import type { Control, FieldPath } from "react-hook-form";
import type { CreateLabRequest } from "@workspace/types";
import { useTranslations } from "next-intl";
import { FormControl, FormField, FormItem, FormLabel, FormMessage, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/form/form-primitives"
import { Badge, Button, DataState, DataTable, Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Form, StatusBadge, Switch, type DataTableColumn } from "@workspace/ui/components";
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
  const t = useTranslations("LabTests.directory");
  return (
    <FormField
      control={control}
      name="type"
      render={({ field }) => (
        <FormItem>
          <FormLabel>{t("typeLabel")}</FormLabel>
          <Select value={field.value} onValueChange={field.onChange}>
            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
            <SelectContent>
              <SelectItem value="INTERNAL">{t("typeInHouse")}</SelectItem>
              <SelectItem value="EXTERNAL">{t("typeExternalPartner")}</SelectItem>
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function LabDirectoryDialog(hook: ReturnType<typeof useLabDirectory>) {
  const t = useTranslations("LabTests.directory");
  return (
    <Dialog open={hook.dialogOpen} onOpenChange={hook.setDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{hook.editing ? t("editTitle") : t("addTitle")}</DialogTitle>
          <DialogDescription>
            {hook.editing ? t("editDescription") : t("addDescription")}
          </DialogDescription>
        </DialogHeader>
        <Form {...hook.form}>
          <form onSubmit={hook.form.handleSubmit(hook.onSubmit)} noValidate>
            <DialogBody className="space-y-4">
              <LabFormInputField control={hook.form.control} name="name" label={t("nameLabel")} placeholder={t("namePlaceholder")} />
              <LabTypeSelectField control={hook.form.control} />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <LabFormInputField control={hook.form.control} name="phone" label={t("phoneLabel")} placeholder={t("phonePlaceholder")} />
                <LabFormInputField control={hook.form.control} name="email" label={t("emailLabel")} placeholder={t("emailPlaceholder")} type="email" />
              </div>
              <LabFormInputField control={hook.form.control} name="address" label={t("addressLabel")} placeholder={t("addressPlaceholder")} />
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => hook.setDialogOpen(false)}>{t("cancelButton")}</Button>
              <Button type="submit" disabled={hook.isSaving}>{hook.editing ? t("saveButton") : t("addLabSubmit")}</Button>
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
  const t = useTranslations("LabTests.directory");
  return (
    <div className="flex items-center justify-end gap-3">
      <div className="flex items-center gap-2">
        <Switch checked={lab.active} onCheckedChange={() => toggleActive(lab)}
          aria-label={lab.active ? t("deactivateAriaLabel") : t("activateAriaLabel")} />
        <span className="text-xs text-muted-foreground">{t("activeLabel")}</span>
      </div>
      <Button size="sm" variant="outline" onClick={() => openEdit(lab)}>{t("editButton")}</Button>
    </div>
  );
}

function LabNameCell({ lab }: { lab: LabContractResponse }) {
  const t = useTranslations("LabTests.directory");
  return (
    <div className="flex items-center gap-2">
      <span className="font-medium">{lab.name}</span>
      <Badge variant={lab.type === "EXTERNAL" ? "secondary" : "outline"}>
        {lab.type === "EXTERNAL" ? t("typeExternal") : t("typeInHouseBadge")}
      </Badge>
    </div>
  );
}

/* ─── Main component ────────────────────────────────────────── */

export function LabDirectorySettings() {
  const hook = useLabDirectory();
  const t = useTranslations("LabTests.directory");

  const columns: DataTableColumn<LabContractResponse>[] = [
    { id: "name", header: t("colLab"), cell: (lab) => <LabNameCell lab={lab} /> },
    { id: "contact", header: t("colContact"), hiddenOnMobile: true, cell: (lab) => (
      <span className="text-sm text-muted-foreground">{lab.phone || lab.email || "—"}</span>
    ) },
    { id: "status", header: t("colStatus"), cell: (lab) => <StatusBadge status={lab.active ? "active" : "inactive"} /> },
    { id: "actions", header: t("colActions"), align: "right", cell: (lab) => (
      <LabActionsCell lab={lab} toggleActive={hook.toggleActive} openEdit={hook.openEdit} />
    ) },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{t("pageTitle")}</h3>
          <p className="text-sm text-muted-foreground">{t("pageDescription")}</p>
        </div>
        <Button className="gap-2" onClick={hook.openCreate}>
          <Plus className="h-4 w-4" />{t("addLabButton")}
        </Button>
      </div>
      <DataState status={hook.status} loadingMessage={t("loadingLabel")} emptyTitle={t("emptyTitle")}
        emptyDescription={t("emptyDescription")}
        emptyAction={{ label: t("addLabButton"), onClick: hook.openCreate }} onRetry={() => hook.refetch()}>
        <DataTable data={hook.labs} columns={columns} rowKey={(lab) => lab.id} />
      </DataState>
      <LabDirectoryDialog {...hook} />
    </div>
  );
}
