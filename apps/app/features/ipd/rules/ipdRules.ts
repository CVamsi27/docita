/**
 * IPD Business Rules
 * Inpatient admission, bed management, and discharge
 */

export type AdmissionStatus =
  | "admitted"
  | "discharged"
  | "transferred"
  | "deceased";
export type BedStatus = "available" | "occupied" | "maintenance" | "reserved";
export type BedType = "general" | "icu" | "private" | "semi-private";
export type WardType =
  | "general"
  | "icu"
  | "pediatric"
  | "maternity"
  | "surgical";

export interface Admission {
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

export interface Bed {
  id: string;
  wardId: string;
  bedNumber: string;
  status: BedStatus;
  currentPatientId?: string;
  type: "general" | "icu" | "private" | "semi-private";
}

export interface Ward {
  id: string;
  name: string;
  floor: number;
  totalBeds: number;
  type: "general" | "icu" | "pediatric" | "maternity" | "surgical";
}

/**
 * Check if patient can be admitted
 */
export function canAdmitPatient(bed: Bed): boolean {
  return bed.status === "available";
}

/**
 * Check if patient can be discharged
 */
export function canDischargePatient(admission: Admission): boolean {
  return admission.status === "admitted";
}

/**
 * Calculate length of stay in days
 */
export function calculateLengthOfStay(
  admissionDate: Date,
  dischargeDate?: Date,
): number {
  const end = dischargeDate ? new Date(dischargeDate) : new Date();
  const start = new Date(admissionDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Get bed occupancy rate
 */
export function getBedOccupancyRate(beds: Bed[]): number {
  if (beds.length === 0) return 0;
  const occupied = beds.filter((b) => b.status === "occupied").length;
  return Math.round((occupied / beds.length) * 100);
}

/**
 * Get available beds in ward
 */
export function getAvailableBeds(beds: Bed[], wardId?: string): Bed[] {
  return beds.filter(
    (b) => b.status === "available" && (!wardId || b.wardId === wardId),
  );
}

/**
 * Get ward statistics
 */
export function getWardStats(ward: Ward, beds: Bed[]) {
  const wardBeds = beds.filter((b) => b.wardId === ward.id);
  return {
    totalBeds: wardBeds.length,
    available: wardBeds.filter((b) => b.status === "available").length,
    occupied: wardBeds.filter((b) => b.status === "occupied").length,
    maintenance: wardBeds.filter((b) => b.status === "maintenance").length,
    occupancyRate: getBedOccupancyRate(wardBeds),
  };
}

/**
 * Check if bed needs cleaning
 */
export function bedNeedsCleaning(bed: Bed): boolean {
  return bed.status === "maintenance";
}

/**
 * Get admission status label
 */
export function getAdmissionStatusLabel(status: AdmissionStatus): string {
  const labels: Record<AdmissionStatus, string> = {
    admitted: "Admitted",
    discharged: "Discharged",
    transferred: "Transferred",
    deceased: "Deceased",
  };
  return labels[status];
}

/**
 * Get bed type label
 */
export function getBedTypeLabel(type: Bed["type"]): string {
  const labels: Record<Bed["type"], string> = {
    general: "General Ward",
    icu: "ICU",
    private: "Private Room",
    "semi-private": "Semi-Private",
  };
  return labels[type];
}
