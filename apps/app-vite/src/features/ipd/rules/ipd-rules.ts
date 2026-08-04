type AdmissionStatus =
  | "admitted"
  | "discharged"
  | "transferred"
  | "deceased";
type BedStatus = "available" | "occupied" | "maintenance" | "reserved";

interface Bed {
  id: string;
  wardId: string;
  bedNumber: string;
  status: BedStatus;
  currentPatientId?: string;
  type: "general" | "icu" | "private" | "semi-private";
}


interface Admission {
  id: string;
  patientId: string;
  admissionDate: Date;
  dischargeDate?: Date;
  status: AdmissionStatus;
  wardId: string;
  bedId: string;
  attendingDoctorId: string;
  diagnosis?: string;
  notes?: string;
}

export function canAdmitPatient(bed: Bed): boolean {
  return bed.status === "available";
}

export function canDischargePatient(admission: Admission): boolean {
  return admission.status === "admitted";
}

export function calculateLengthOfStay(
  admissionDate: Date,
  dischargeDate?: Date,
): number {
  const end = dischargeDate ? new Date(dischargeDate) : new Date();
  const start = new Date(admissionDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function getBedOccupancyRate(beds: Bed[]): number {
  if (beds.length === 0) return 0;
  const occupied = beds.filter((b) => b.status === "occupied").length;
  return Math.round((occupied / beds.length) * 100);
}

export function getAvailableBeds(beds: Bed[], wardId?: string): Bed[] {
  return beds.filter(
    (b) => b.status === "available" && (!wardId || b.wardId === wardId),
  );
}
