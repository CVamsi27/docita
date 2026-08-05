import type { FieldValues, UseFormReturn } from "react-hook-form";
import { rhfPath } from "@workspace/ui/lib/rhf-path";
import { FormControl, FormField, FormItem, FormLabel, FormMessage, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/form/form-primitives";
import { useLabs } from "@workspace/data-access";
import { useTranslation } from "react-i18next";

const LAB_UNASSIGNED_VALUE = "__unassigned__";

export function TeamMemberContactFields<TFormValues extends FieldValues>({
  form,
}: {
  form: UseFormReturn<TFormValues>;
}) {
  const { t } = useTranslation("Settings.teamMemberForm");
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <FormField
        control={form.control}
        name={rhfPath<TFormValues>("email")}
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("emailLabel")}</FormLabel>
            <FormControl>
              <Input type="email" placeholder={t("emailPlaceholder")} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name={rhfPath<TFormValues>("phoneNumber")}
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("phoneLabel")}</FormLabel>
            <FormControl>
              <Input placeholder={t("phonePlaceholder")} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}

interface TeamMemberLabFieldProps<TFormValues extends FieldValues> {
  form: UseFormReturn<TFormValues>;
}

export function TeamMemberLabField<TFormValues extends FieldValues>({
  form,
}: TeamMemberLabFieldProps<TFormValues>) {
  const { t } = useTranslation("Settings.teamMemberForm");
  const { data: labs = [] } = useLabs();
  const activeLabs = labs.filter((lab) => lab.active);

  return (
    <FormField
      control={form.control}
      name={rhfPath<TFormValues>("labId")}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{t("labLabel")}</FormLabel>
          <Select
            value={field.value ?? LAB_UNASSIGNED_VALUE}
            onValueChange={(value) =>
              field.onChange(value === LAB_UNASSIGNED_VALUE ? undefined : value)
            }
          >
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder={t("labAssignPlaceholder")} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              <SelectItem value={LAB_UNASSIGNED_VALUE}>
                {t("labUnassigned")}
              </SelectItem>
              {activeLabs.map((lab) => (
                <SelectItem key={lab.id} value={lab.id}>
                  {lab.name}
                  {lab.type === "EXTERNAL" ? t("labExternalSuffix") : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

type DoctorRegistrationField = "specialization" | "qualification" | "registrationNumber";

interface DoctorRegistrationFieldsProps<TFormValues extends FieldValues> {
  form: UseFormReturn<TFormValues>;
  /**
   * Translation function scoped to the calling component's namespace.
   * The caller must ensure the following keys exist:
   *   - `specializationLabel`, `specializationPlaceholder`
   *   - `qualificationLabel`, `qualificationPlaceholder`
   *   - `registrationNumberLabel`, `registrationNumberPlaceholder`
   */
  t: (key: string) => string;
}

const DOCTOR_REGISTRATION_FIELDS: ReadonlyArray<{
  name: DoctorRegistrationField;
  labelKey: string;
  placeholderKey: string;
}> = [
  {
    name: "specialization",
    labelKey: "specializationLabel",
    placeholderKey: "specializationPlaceholder",
  },
  {
    name: "qualification",
    labelKey: "qualificationLabel",
    placeholderKey: "qualificationPlaceholder",
  },
  {
    name: "registrationNumber",
    labelKey: "registrationNumberLabel",
    placeholderKey: "registrationNumberPlaceholder",
  },
];

export function DoctorRegistrationFields<TFormValues extends FieldValues>({
  form,
  t,
}: DoctorRegistrationFieldsProps<TFormValues>) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {DOCTOR_REGISTRATION_FIELDS.map(({ name, labelKey, placeholderKey }) => (
        <FormField
          key={name}
          control={form.control}
          name={rhfPath<TFormValues>(name)}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t(labelKey)}</FormLabel>
              <FormControl>
                <Input placeholder={t(placeholderKey)} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      ))}
    </div>
  );
}
