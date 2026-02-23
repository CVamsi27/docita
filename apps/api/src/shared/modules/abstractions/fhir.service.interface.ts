/**
 * FHIR Service Interface
 *
 * Defines the contract for FHIR integration and interoperability.
 * Allows implementations for FHIR servers, EHR systems, etc.
 *
 * @interface IFhirService
 */
export interface IFhirService {
  /**
   * Convert Docita patient to FHIR Patient resource
   * @param docitaPatient - Docita patient object
   * @returns FHIR Patient resource
   */
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

  /**
   * Convert Docita appointment to FHIR Appointment resource
   * @param docitaAppointment - Docita appointment object
   * @returns FHIR Appointment resource
   */
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

  /**
   * Convert Docita prescription to FHIR MedicationRequest
   * @param docitaPrescription - Docita prescription object
   * @returns FHIR MedicationRequest resource
   */
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

  /**
   * Convert FHIR resource to Docita format
   * @param fhirResource - FHIR resource object
   * @param resourceType - Type of FHIR resource
   * @returns Docita object
   */
  fhirToDocita(
    fhirResource: Record<string, unknown>,
    resourceType: 'Patient' | 'Appointment' | 'MedicationRequest',
  ): Record<string, unknown>;

  /**
   * Validate FHIR resource against schema
   * @param fhirResource - FHIR resource to validate
   * @returns Promise with validation result
   */
  validateFhirResource(fhirResource: Record<string, unknown>): Promise<{
    valid: boolean;
    errors?: string[];
    warnings?: string[];
  }>;

  /**
   * Push patient data to external FHIR server
   * @param fhirServerUrl - FHIR server endpoint
   * @param fhirResource - FHIR resource to push
   * @param authToken - Optional authentication token
   * @returns Promise with push result
   */
  pushToFhirServer(
    fhirServerUrl: string,
    fhirResource: Record<string, unknown>,
    authToken?: string,
  ): Promise<{
    success: boolean;
    resourceId?: string;
    error?: string;
  }>;

  /**
   * Fetch patient data from external FHIR server
   * @param fhirServerUrl - FHIR server endpoint
   * @param resourceId - Resource ID to fetch
   * @param resourceType - Type of resource
   * @param authToken - Optional authentication token
   * @returns Promise with FHIR resource
   */
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

  /**
   * Search for resources on FHIR server
   * @param fhirServerUrl - FHIR server endpoint
   * @param resourceType - Type of resource to search
   * @param searchParams - Search parameters
   * @param authToken - Optional authentication token
   * @returns Promise with search results
   */
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
