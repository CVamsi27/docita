import { useMemo } from "react";
import { Input } from "@workspace/ui/components/form/input";
import { Label } from "@workspace/ui/components/form/label";
import { Textarea } from "@workspace/ui/components/form/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/form/select";
import { useDoctors } from "@workspace/data-access";
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

export function AdmissionFormFields({
  wardId, bedId, admittingDoctorId, diagnosis, notes, wards, errors,
  onWardChange, onBedChange, onDoctorChange, onDiagnosisChange, onNotesChange,
}: AdmissionFormFieldsProps) {
  const { data: doctors = [] } = useDoctors();

  const availableBeds = useMemo(() => {
    const ward = wards.find((item) => item.id === wardId);
    return (
      ward?.rooms.flatMap((room) =>
        room.beds
          .filter((bed) => bed.status === "AVAILABLE")
          .map((bed) => ({
            id: bed.id,
            label: `${ward.name} / Room ${room.roomNumber} / Bed ${bed.bedNumber}`,
          })),
      ) ?? []
    );
  }, [wardId, wards]);

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="ipd-ward">Ward</Label>
          <Select value={wardId} onValueChange={onWardChange}>
            <SelectTrigger id="ipd-ward">
              <SelectValue placeholder="Select ward" />
            </SelectTrigger>
            <SelectContent>
              {wards.map((ward) => (
                <SelectItem key={ward.id} value={ward.id}>{ward.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="ipd-bed">Bed</Label>
          <Select value={bedId} onValueChange={onBedChange} disabled={!wardId}>
            <SelectTrigger id="ipd-bed" aria-invalid={!!errors.bedId}>
              <SelectValue placeholder="Select bed" />
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
        <Label htmlFor="ipd-doctor">Attending doctor</Label>
        <Select value={admittingDoctorId} onValueChange={onDoctorChange}>
          <SelectTrigger id="ipd-doctor" aria-invalid={!!errors.admittingDoctorId}>
            <SelectValue placeholder="Select doctor" />
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
        <Label htmlFor="ipd-diagnosis">Admission diagnosis</Label>
        <Textarea id="ipd-diagnosis" className="min-h-20" value={diagnosis} onChange={(e) => onDiagnosisChange(e.target.value)} aria-invalid={!!errors.diagnosis} />
        {errors.diagnosis && <p className="text-xs text-destructive">{errors.diagnosis}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="ipd-notes">Notes</Label>
        <Textarea id="ipd-notes" className="min-h-16" value={notes} onChange={(e) => onNotesChange(e.target.value)} />
      </div>
    </>
  );
}
