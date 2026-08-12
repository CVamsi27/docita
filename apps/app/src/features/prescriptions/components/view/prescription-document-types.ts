/** Shared shapes for the prescription document surface — previously declared
 *  verbatim in PrescriptionDocument, PrescriptionDocumentHeader,
 *  PrescriptionDocumentFooter, and PrescriptionViewPageContent. */
export interface DoctorInfo {
  name?: string;
  qualification?: string | null;
  registrationNumber?: string | null;
  signatureUrl?: string | null;
}

export interface ClinicInfo {
  id?: string;
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
  logo?: string | null;
}
