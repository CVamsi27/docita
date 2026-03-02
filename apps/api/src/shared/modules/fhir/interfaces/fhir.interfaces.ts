export interface FhirResource {
  resourceType: string;
  id: string;
  meta?: {
    versionId?: string;
    lastUpdated?: string;
    profile?: string[];
  };
}

export interface FhirPatient extends FhirResource {
  resourceType: 'Patient';
  identifier?: Array<{
    use?: string;
    type?: { coding: Array<{ system: string; code: string; display: string }> };
    system?: string;
    value: string;
  }>;
  active?: boolean;
  name?: Array<{
    use?: string;
    family?: string;
    given?: string[];
    prefix?: string[];
    suffix?: string[];
  }>;
  telecom?: Array<{
    system?: string;
    value?: string;
    use?: string;
  }>;
  gender?: 'male' | 'female' | 'other' | 'unknown';
  birthDate?: string;
  deceasedBoolean?: boolean;
  address?: Array<{
    use?: string;
    type?: string;
    text?: string;
    line?: string[];
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  }>;
  maritalStatus?: {
    coding: Array<{ system: string; code: string; display: string }>;
  };
  communication?: Array<{
    language: {
      coding: Array<{ system: string; code: string; display: string }>;
    };
    preferred?: boolean;
  }>;
  extension?: Array<{
    url: string;
    valueCode?: string;
    valueCoding?: { system: string; code: string; display: string };
    valueString?: string;
  }>;
  contact?: Array<{
    relationship?: Array<{
      coding: Array<{ system: string; code: string; display: string }>;
    }>;
    name?: { family?: string; given?: string[] };
    telecom?: Array<{ system?: string; value?: string; use?: string }>;
  }>;
}

export interface FhirObservation extends FhirResource {
  resourceType: 'Observation';
  status:
    | 'registered'
    | 'preliminary'
    | 'final'
    | 'amended'
    | 'corrected'
    | 'cancelled'
    | 'entered-in-error'
    | 'unknown';
  category?: Array<{
    coding: Array<{ system: string; code: string; display: string }>;
  }>;
  code: {
    coding: Array<{ system: string; code: string; display: string }>;
    text?: string;
  };
  subject: { reference: string; display?: string };
  encounter?: { reference: string };
  effectiveDateTime?: string;
  issued?: string;
  valueQuantity?: { value: number; unit: string; system: string; code: string };
  valueString?: string;
  component?: Array<{
    code: { coding: Array<{ system: string; code: string; display: string }> };
    valueQuantity?: {
      value: number;
      unit: string;
      system: string;
      code: string;
    };
  }>;
}

export interface FhirMedicationRequest extends FhirResource {
  resourceType: 'MedicationRequest';
  status:
    | 'active'
    | 'on-hold'
    | 'cancelled'
    | 'completed'
    | 'entered-in-error'
    | 'stopped'
    | 'draft'
    | 'unknown';
  intent:
    | 'proposal'
    | 'plan'
    | 'order'
    | 'original-order'
    | 'reflex-order'
    | 'filler-order'
    | 'instance-order'
    | 'option';
  medicationCodeableConcept?: {
    coding: Array<{ system: string; code: string; display: string }>;
    text?: string;
  };
  subject: { reference: string; display?: string };
  encounter?: { reference: string };
  authoredOn?: string;
  requester?: { reference: string; display?: string };
  dosageInstruction?: Array<{
    sequence?: number;
    text?: string;
    timing?: {
      repeat?: {
        frequency?: number;
        period?: number;
        periodUnit?: string;
        when?: string[];
      };
      code?: {
        coding: Array<{ system: string; code: string; display: string }>;
      };
    };
    route?: {
      coding: Array<{ system: string; code: string; display: string }>;
    };
    doseAndRate?: Array<{
      type?: {
        coding: Array<{ system: string; code: string; display: string }>;
      };
      doseQuantity?: {
        value: number;
        unit: string;
        system: string;
        code: string;
      };
    }>;
  }>;
  dispenseRequest?: {
    numberOfRepeatsAllowed?: number;
    quantity?: { value: number; unit: string };
    expectedSupplyDuration?: {
      value: number;
      unit: string;
      system: string;
      code: string;
    };
  };
}

export interface FhirCondition extends FhirResource {
  resourceType: 'Condition';
  clinicalStatus?: {
    coding: Array<{ system: string; code: string; display: string }>;
  };
  verificationStatus?: {
    coding: Array<{ system: string; code: string; display: string }>;
  };
  category?: Array<{
    coding: Array<{ system: string; code: string; display: string }>;
  }>;
  severity?: {
    coding: Array<{ system: string; code: string; display: string }>;
  };
  code?: {
    coding: Array<{ system: string; code: string; display: string }>;
    text?: string;
  };
  subject: { reference: string; display?: string };
  encounter?: { reference: string };
  onsetDateTime?: string;
  abatementDateTime?: string;
  recordedDate?: string;
  note?: Array<{ text: string }>;
}

export interface FhirAllergyIntolerance extends FhirResource {
  resourceType: 'AllergyIntolerance';
  clinicalStatus?: {
    coding: Array<{ system: string; code: string; display: string }>;
  };
  verificationStatus?: {
    coding: Array<{ system: string; code: string; display: string }>;
  };
  type?: 'allergy' | 'intolerance';
  category?: Array<'food' | 'medication' | 'environment' | 'biologic'>;
  criticality?: 'low' | 'high' | 'unable-to-assess';
  code?: {
    coding: Array<{ system: string; code: string; display: string }>;
    text?: string;
  };
  patient: { reference: string; display?: string };
  onsetDateTime?: string;
  recordedDate?: string;
  recorder?: { reference: string; display?: string };
  reaction?: Array<{
    manifestation: Array<{
      coding: Array<{ system: string; code: string; display: string }>;
      text?: string;
    }>;
    severity?: 'mild' | 'moderate' | 'severe';
  }>;
}

export interface FhirImmunization extends FhirResource {
  resourceType: 'Immunization';
  status: 'completed' | 'entered-in-error' | 'not-done';
  vaccineCode: {
    coding: Array<{ system: string; code: string; display: string }>;
    text?: string;
  };
  patient: { reference: string; display?: string };
  occurrenceDateTime?: string;
  recorded?: string;
  lotNumber?: string;
  expirationDate?: string;
  site?: { coding: Array<{ system: string; code: string; display: string }> };
  route?: { coding: Array<{ system: string; code: string; display: string }> };
  doseQuantity?: { value: number; unit: string };
  performer?: Array<{ actor: { reference: string; display?: string } }>;
  reaction?: Array<{ date?: string; detail?: { reference: string } }>;
}

export interface FhirAppointment extends FhirResource {
  resourceType: 'Appointment';
  status:
    | 'proposed'
    | 'pending'
    | 'booked'
    | 'arrived'
    | 'fulfilled'
    | 'cancelled'
    | 'noshow'
    | 'entered-in-error'
    | 'checked-in'
    | 'waitlist';
  appointmentType?: {
    coding: Array<{ system: string; code: string; display: string }>;
  };
  reasonCode?: Array<{
    coding: Array<{ system: string; code: string; display: string }>;
    text?: string;
  }>;
  description?: string;
  start?: string;
  end?: string;
  created?: string;
  comment?: string;
  participant: Array<{
    actor?: { reference: string; display?: string };
    status: 'accepted' | 'declined' | 'tentative' | 'needs-action';
    type?: Array<{
      coding: Array<{ system: string; code: string; display: string }>;
    }>;
  }>;
}

export interface FhirBundle extends FhirResource {
  resourceType: 'Bundle';
  type:
    | 'document'
    | 'message'
    | 'transaction'
    | 'transaction-response'
    | 'batch'
    | 'batch-response'
    | 'history'
    | 'searchset'
    | 'collection';
  timestamp?: string;
  total?: number;
  entry?: Array<{
    fullUrl?: string;
    resource: FhirResource;
  }>;
  identifier?: {
    system?: string;
    value?: string;
  };
}
