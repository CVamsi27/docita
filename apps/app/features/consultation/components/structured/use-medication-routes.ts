import { useMemo } from "react";
import { useClinicSettings } from "@workspace/data-access";
import { ClinicFeatureService } from "@/lib/services/clinic-feature.service";
import { clinicTypeSchema, type ClinicType } from "@workspace/types";
import { parseStringEnumMember } from "@workspace/utils";

export function useMedicationRoutes() {
  const { data: clinic } = useClinicSettings();

  const clinicType = useMemo((): ClinicType | undefined => {
    if (!clinic?.type) return undefined;
    return parseStringEnumMember(clinicTypeSchema.options, clinic.type) ?? undefined;
  }, [clinic?.type]);

  const groupedRoutes = useMemo(() => {
    return ClinicFeatureService.getMedicationRoutesGrouped(clinicType);
  }, [clinicType]);

  const prioritizedRoutes = useMemo(() => {
    return ClinicFeatureService.getMedicationRoutes(clinicType);
  }, [clinicType]);

  const defaultRoute = useMemo(
    () => prioritizedRoutes[0]?.value || "ORAL",
    [prioritizedRoutes],
  );

  return { groupedRoutes, prioritizedRoutes, defaultRoute };
}
