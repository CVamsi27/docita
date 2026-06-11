"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  useClinicSettings,
  useUpdateClinicSettings,
} from "@workspace/data-access";
import {
  getClinicGstin,
  getFacilityLabel,
  parseStringEnumMember,
} from "@workspace/utils";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import {
  clinicSettingsFormSchema,
  facilityTypeSchema,
  type ClinicSettingsFormValues,
  type FacilityTypeType,
} from "@workspace/types";

const FACILITY_LABEL_VALUES = facilityTypeSchema.options;

export function useClinicGeneralSettings() {
  const { data: clinic, isLoading } = useClinicSettings();
  const { mutate: updateClinic, isPending } = useUpdateClinicSettings();

  const legacyFacilityLabel =
    typeof clinic?.settings === "object" &&
    clinic?.settings !== null &&
    !Array.isArray(clinic.settings) &&
    typeof clinic.settings.facilityLabel === "string"
      ? clinic.settings.facilityLabel
      : undefined;

  const facilityLabel = getFacilityLabel(
    parseStringEnumMember(
      FACILITY_LABEL_VALUES,
      clinic?.facilityType ?? legacyFacilityLabel ?? "",
    ) ?? undefined,
  );

  const form = useForm<ClinicSettingsFormValues>({
    resolver: zodResolver(clinicSettingsFormSchema),
    defaultValues: {
      name: "",
      address: "",
      phone: "",
      gstin: "",
      legalName: "",
      facilityLabel: "CLINIC",
      mapsLink: "",
    },
  });

  useEffect(() => {
    if (clinic) {
      const settings = clinic.settings as
        | {
            facilityLabel?: FacilityTypeType;
            mapsLink?: string;
            taxSettings?: { legalName?: string };
          }
        | null
        | undefined;
      form.reset({
        name: clinic.name || "",
        address: clinic.address || "",
        phone: clinic.phone || "",
        gstin: getClinicGstin(clinic.settings) || "",
        legalName: settings?.taxSettings?.legalName ?? "",
        facilityLabel:
          clinic.facilityType ?? settings?.facilityLabel ?? "CLINIC",
        mapsLink: settings?.mapsLink ?? "",
      });
    }
  }, [clinic, form]);

  const watchedMapsLink = form.watch("mapsLink")?.trim() ?? "";

  const handleSubmit = (data: ClinicSettingsFormValues) => {
    const { legalName, ...rest } = data;
    const trimmedLegalName = (legalName ?? "").trim();
    const payload: Parameters<typeof updateClinic>[0] = {
      ...rest,
      ...(trimmedLegalName.length > 0
        ? { taxSettings: { legalName: trimmedLegalName } }
        : {}),
    };
    updateClinic(payload, {
      onSuccess: () => {
        toast.success("Facility settings updated successfully");
      },
      onError: (error) => {
        showUserFacingErrorToast(
          error,
          "We could not save your facility details. Please try again.",
          "save",
        );
      },
    });
  };

  return {
    clinic,
    isLoading,
    isPending,
    facilityLabel,
    form,
    watchedMapsLink,
    handleSubmit,
    facilityLabelValues: FACILITY_LABEL_VALUES,
  };
}
