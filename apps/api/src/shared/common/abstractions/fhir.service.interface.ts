export interface IFhirService {
  patientToFhir(docitaPatient: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    phoneNumber?: string;
    dateOfBirth?: Date;
    gender?: 'M' | 'F' | 'O';
  }): {
    resourceType: 'Patient';
    id: string;
    name: Array<{ given: string[]; family: string }>;
    telecom?: Array<{ system: string; value: string }>;
    birthDate?: string;
    gender?: string;
  };

  appointmentToFhir(docitaAppointment: {
    id: string;
    patientId: string;
    doctorId: string;
    status: string;
    startTime: Date;
    endTime: Date;
    reason?: string;
  }): {
    resourceType: 'Appointment';
    id: string;
    status: string;
    participant: Array<{
      actor: { reference: string };
      status: string;
    }>;
    start: string;
    end: string;
    description?: string;
  };

  prescriptionToFhir(docitaPrescription: {
    id: string;
    patientId: string;
    medications: Array<{
      name: string;
      dosage: string;
      frequency: string;
      duration: string;
    }>;
    prescribedDate: Date;
    prescribedBy: string;
  }): {
    resourceType: 'MedicationRequest';
    id: string;
    status: string;
    intent: string;
    subject: { reference: string };
    medicationCodeableConcept?: { text: string };
    dosageInstruction?: Array<{
      text: string;
      timing?: Record<string, unknown>;
    }>;
    authoredOn: string;
    requester: { reference: string };
  };

  fhirToDocita(
    fhirResource: Record<string, unknown>,
    resourceType: 'Patient' | 'Appointment' | 'MedicationRequest',
  ): Record<string, unknown>;

  validateFhirResource(fhirResource: Record<string, unknown>): Promise<{
    valid: boolean;
    errors?: string[];
    warnings?: string[];
  }>;

  pushToFhirServer(
    fhirServerUrl: string,
    fhirResource: Record<string, unknown>,
    authToken?: string,
  ): Promise<{
    success: boolean;
    resourceId?: string;
    error?: string;
  }>;

  fetchFromFhirServer(
    fhirServerUrl: string,
    resourceId: string,
    resourceType: string,
    authToken?: string,
  ): Promise<{
    success: boolean;
    resource?: Record<string, unknown>;
    error?: string;
  }>;

  searchFhirServer(
    fhirServerUrl: string,
    resourceType: string,
    searchParams: Record<string, string>,
    authToken?: string,
  ): Promise<{
    success: boolean;
    results?: Array<Record<string, unknown>>;
    total?: number;
    error?: string;
  }>;
}

export const FHIR_SERVICE_TOKEN = 'IFhirService';
