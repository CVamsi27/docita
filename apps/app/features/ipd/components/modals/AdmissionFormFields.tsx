import { useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Textarea } from "@workspace/ui/components/form/form-primitives";
import { Label } from "@workspace/ui/components";
import { useDoctors } from "@workspace/data-access";
import { useTranslations } from "next-intl";
import type { WardWithRooms as WardInfo } from "@/features/ipd/hooks/use-ipd-logic";

interface AdmissionFormFieldsProps {
  wardId: string;
  bedId: string;
  admittingDoctorId: string;
  diagnosis: string;
  notes: string;
  wards: WardInfo[];
  errors: { patientId?: string; bedId?: string; admittingDoctorId?: string; diagnosis?: string };
  onWardChange: (value: string) => void;
  onBedChange: (value: string) => void;
  onDoctorChange: (value: string) => void;
  onDiagnosisChange: (value: string) => void;
  onNotesChange: (value: string) => void;
}

/**
 * Phase 3 (per-feature): apps/app IPD > Admission form fields.
 * 6 literals converted to useTranslations("Ipd.admissionFormFields").
 */
function useAdmissionFormFieldsTranslations() {
  return useTranslations("Ipd.admissionFormFields");
}

export function AdmissionFormFields({
  wardId, bedId, admittingDoctorId, diagnosis, notes, wards, errors,
  onWardChange, onBedChange, onDoctorChange, onDiagnosisChange, onNotesChange,
}: AdmissionFormFieldsProps) {
  const t = useAdmissionFormFieldsTranslations();
  const { data: doctors = [] } = useDoctors();

  const availableBeds = useMemo(() => {
    const ward = wards.find((item) => item.id === wardId);
    return (
      ward?.rooms.flatMap((room) =>
        room.beds
          .filter((bed) => bed.status === "AVAILABLE")
          .map((bed) => ({
            id: bed.id,
            label: t("bedOptionLabel", {
              ward: ward.name,
              room: room.roomNumber,
              bed: bed.bedNumber,
            }),
          })),
      ) ?? []
    );
  }, [wardId, wards, t]);

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="ipd-ward">{t("wardLabel")}</Label>
          <Select value={wardId} onValueChange={onWardChange}>
            <SelectTrigger id="ipd-ward">
              <SelectValue placeholder={t("wardPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {wards.map((ward) => (
                <SelectItem key={ward.id} value={ward.id}>{ward.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="ipd-bed">{t("bedLabel")}</Label>
          <Select value={bedId} onValueChange={onBedChange} disabled={!wardId}>
            <SelectTrigger id="ipd-bed" aria-invalid={!!errors.bedId}>
              <SelectValue placeholder={t("bedPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {availableBeds.map((bed) => (
                <SelectItem key={bed.id} value={bed.id}>{bed.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.bedId && <p className="text-xs text-destructive">{errors.bedId}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="ipd-doctor">{t("doctorLabel")}</Label>
        <Select value={admittingDoctorId} onValueChange={onDoctorChange}>
          <SelectTrigger id="ipd-doctor" aria-invalid={!!errors.admittingDoctorId}>
            <SelectValue placeholder={t("doctorPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            {doctors.map((doc) => (
              <SelectItem key={doc.id} value={doc.id}>{doc.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.admittingDoctorId && <p className="text-xs text-destructive">{errors.admittingDoctorId}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="ipd-diagnosis">{t("diagnosisLabel")}</Label>
        <Textarea id="ipd-diagnosis" className="min-h-20" value={diagnosis} onChange={(e) => onDiagnosisChange(e.target.value)} aria-invalid={!!errors.diagnosis} />
        {errors.diagnosis && <p className="text-xs text-destructive">{errors.diagnosis}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="ipd-notes">{t("notesLabel")}</Label>
        <Textarea id="ipd-notes" className="min-h-16" value={notes} onChange={(e) => onNotesChange(e.target.value)} />
      </div>
    </>
  );
}
