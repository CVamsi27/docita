export interface IDoctorClinicsRepository {
  findAssignment(doctorId: string, clinicId: string): Promise<unknown | null>;
  reactivateAssignment(
    assignmentId: string,
    role: string,
  ): Promise<Record<string, unknown>>;
  createAssignment(
    doctorId: string,
    clinicId: string,
    role: string,
  ): Promise<Record<string, unknown>>;
  assignUserClinic(doctorId: string, clinicId: string): Promise<void>;
  deactivateAssignment(assignmentId: string): Promise<Record<string, unknown>>;
  findDoctorClinics(doctorId: string): Promise<unknown[]>;
  findClinicDoctors(clinicId: string): Promise<unknown[]>;
  updateAssignmentRole(
    assignmentId: string,
    role: string,
  ): Promise<Record<string, unknown>>;
}

export const DOCTOR_CLINICS_REPOSITORY_TOKEN = 'IDoctorClinicsRepository';
