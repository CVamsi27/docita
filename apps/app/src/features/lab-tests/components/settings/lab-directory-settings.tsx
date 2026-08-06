import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";
import type { LabContractResponse } from "@workspace/types";
import type { Control, FieldPath } from "react-hook-form";
import type { CreateLabRequest } from "@workspace/types";
import { Button, Input, Switch } from "@workspace/ui/components";
import {
  FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@workspace/ui/components/form/form-primitives";
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
  const { t } = useTranslation("LabTests");
  return (
    <FormField
      control={control}
      name="type"
      render={({ field }) => (
        <FormItem>
          <FormLabel>{t("directory.typeLabel")}</FormLabel>
          <Select value={field.value} onValueChange={field.onChange}>
            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
            <SelectContent>
              <SelectItem value="INTERNAL">{t("directory.typeInHouse")}</SelectItem>
              <SelectItem value="EXTERNAL">{t("directory.typeExternalPartner")}</SelectItem>
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function LabDirectoryDialog(hook: ReturnType<typeof useLabDirectory>) {
  const { t } = useTranslation("LabTests");
  return (
    <Dialog open={hook.dialogOpen} onOpenChange={hook.setDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{hook.editing ? t("directory.editTitle") : t("directory.addTitle")}</DialogTitle>
          <DialogDescription>
            {hook.editing ? t("directory.editDescription") : t("directory.addDescription")}
          </DialogDescription>
        </DialogHeader>
        <Form {...hook.form}>
          <form onSubmit={hook.form.handleSubmit(hook.onSubmit)} noValidate>
            <DialogBody className="space-y-4">
              <LabFormInputField control={hook.form.control} name="name" label={t("directory.nameLabel")} placeholder={t("directory.namePlaceholder")} />
              <LabTypeSelectField control={hook.form.control} />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <LabFormInputField control={hook.form.control} name="phone" label={t("directory.phoneLabel")} placeholder={t("directory.phonePlaceholder")} />
                <LabFormInputField control={hook.form.control} name="email" label={t("directory.emailLabel")} placeholder={t("directory.emailPlaceholder")} type="email" />
              </div>
              <LabFormInputField control={hook.form.control} name="address" label={t("directory.addressLabel")} placeholder={t("directory.addressPlaceholder")} />
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => hook.setDialogOpen(false)}>{t("directory.cancelButton")}</Button>
              <Button type="submit" disabled={hook.isSaving}>{hook.editing ? t("directory.saveButton") : t("directory.addLabSubmit")}</Button>
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
  const { t } = useTranslation("LabTests");
  return (
    <div className="flex items-center justify-end gap-3">
      <div className="flex items-center gap-2">
        <Switch checked={lab.active} onCheckedChange={() => toggleActive(lab)}
          aria-label={lab.active ? t("directory.deactivateAriaLabel") : t("directory.activateAriaLabel")} />
        <span className="text-xs text-muted-foreground">{t("directory.activeLabel")}</span>
      </div>
      <Button size="sm" variant="outline" onClick={() => openEdit(lab)}>{t("directory.editButton")}</Button>
    </div>
  );
}

function LabNameCell({ lab }: { lab: LabContractResponse }) {
  const { t } = useTranslation("LabTests");
  return (
    <div className="flex items-center gap-2">
      <span className="font-medium">{lab.name}</span>
      <Badge variant={lab.type === "EXTERNAL" ? "secondary" : "outline"}>
        {lab.type === "EXTERNAL" ? t("directory.typeExternal") : t("directory.typeInHouseBadge")}
      </Badge>
    </div>
  );
}

/* ─── Main component ────────────────────────────────────────── */

export function LabDirectorySettings() {
  const hook = useLabDirectory();
  const { t } = useTranslation("LabTests");

  const columns: DataTableColumn<LabContractResponse>[] = [
    { id: "name", header: t("directory.colLab"), cell: (lab) => <LabNameCell lab={lab} /> },
    { id: "contact", header: t("directory.colContact"), hiddenOnMobile: true, cell: (lab) => (
      <span className="text-sm text-muted-foreground">{lab.phone || lab.email || "—"}</span>
    ) },
    { id: "status", header: t("directory.colStatus"), cell: (lab) => <StatusBadge status={lab.active ? "active" : "inactive"} /> },
    { id: "actions", header: t("directory.colActions"), align: "right", cell: (lab) => (
      <LabActionsCell lab={lab} toggleActive={hook.toggleActive} openEdit={hook.openEdit} />
    ) },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{t("directory.pageTitle")}</h3>
          <p className="text-sm text-muted-foreground">{t("directory.pageDescription")}</p>
        </div>
        <Button className="gap-2" onClick={hook.openCreate}>
          <Plus className="h-4 w-4" />{t("directory.addLabButton")}
        </Button>
      </div>
      <DataState status={hook.status} loadingMessage={t("directory.loadingLabel")} emptyTitle={t("directory.emptyTitle")}
        emptyDescription={t("directory.emptyDescription")}
        emptyAction={{ label: t("directory.addLabButton"), onClick: hook.openCreate }} onRetry={() => hook.refetch()}>
        <DataTable data={hook.labs} columns={columns} rowKey={(lab) => lab.id} />
      </DataState>
      <LabDirectoryDialog {...hook} />
    </div>
  );
}
