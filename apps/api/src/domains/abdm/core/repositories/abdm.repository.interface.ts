import type {
  AbdmCareContext,
  AbdmCareContextSource,
  AbdmCareContextStatus,
  AbdmConsentRequest,
  AbdmExternalRecord,
  AbdmGatewayCallback,
  AbdmTransaction,
  AbdmTransactionDirection,
  AbdmTransactionStatus,
  AbdmTransactionType,
  CreateAbdmConsentRequest,
  JsonValueSchemaType,
} from '@workspace/types';

export interface AbdmPatientLookup {
  id: string;
  abhaAddress: string | null;
  abhaVerifiedAt: Date | null;
}

export interface AbdmSourceRecord {
  patientId: string;
  display: string;
  hiType: string;
  occurredAt: Date;
}

export interface AbdmCareContextWithBundle extends AbdmCareContext {
  fhirBundle: JsonValueSchemaType;
}

export interface AbdmRepository {
  isClinicAbdmEnabled(clinicId: string): Promise<boolean>;
  findPatient(
    clinicId: string,
    patientId: string,
  ): Promise<AbdmPatientLookup | null>;
  findSourceRecord(
    clinicId: string,
    sourceType: AbdmCareContextSource,
    sourceId: string,
  ): Promise<AbdmSourceRecord | null>;
  upsertCareContext(input: {
    clinicId: string;
    patientId: string;
    sourceType: AbdmCareContextSource;
    sourceId: string;
    referenceNumber: string;
    display: string;
    hiType: string;
    fhirBundle: JsonValueSchemaType;
  }): Promise<AbdmCareContext>;
  listCareContexts(
    clinicId: string,
    patientId?: string,
  ): Promise<AbdmCareContext[]>;
  findCareContext(
    clinicId: string,
    id: string,
  ): Promise<AbdmCareContext | null>;
  findCareContextByReference(
    clinicId: string,
    referenceNumber: string,
  ): Promise<AbdmCareContextWithBundle | null>;
  markCareContextLinked(
    clinicId: string,
    id: string,
    linkedAt: Date,
  ): Promise<AbdmCareContext>;
  markCareContextShared(
    clinicId: string,
    id: string,
    sharedAt: Date,
  ): Promise<AbdmCareContext>;
  updateCareContextStatus(
    clinicId: string,
    id: string,
    status: AbdmCareContextStatus,
  ): Promise<AbdmCareContext>;
  createTransaction(input: {
    clinicId: string;
    patientId?: string;
    careContextId?: string;
    type: AbdmTransactionType;
    direction: AbdmTransactionDirection;
    status: AbdmTransactionStatus;
    requestId?: string;
    transactionId?: string;
    correlationId?: string;
    payload?: JsonValueSchemaType;
    error?: string;
  }): Promise<AbdmTransaction>;
  listTransactions(
    clinicId: string,
    statuses?: AbdmTransactionStatus[],
  ): Promise<AbdmTransaction[]>;
  createConsentRequest(
    clinicId: string,
    input: CreateAbdmConsentRequest,
    requestId: string,
    requestedAt: Date,
  ): Promise<AbdmConsentRequest>;
  listConsentRequests(
    clinicId: string,
    patientId?: string,
  ): Promise<AbdmConsentRequest[]>;
  updateConsentFromCallback(input: {
    clinicId: string;
    requestId?: string;
    consentId?: string;
    status: 'GRANTED' | 'DENIED' | 'EXPIRED' | 'REVOKED' | 'FAILED';
    artefactId?: string;
    rawArtifact?: JsonValueSchemaType;
    at: Date;
  }): Promise<AbdmConsentRequest | null>;
  recordCallback(
    clinicId: string,
    type: AbdmTransactionType,
    callback: AbdmGatewayCallback,
  ): Promise<AbdmTransaction>;
  recordExternalRecord(input: {
    clinicId: string;
    patientId: string;
    consentRequestId?: string;
    sourceHipId?: string;
    careContextReference?: string;
    hiType: string;
    fhirBundle?: JsonValueSchemaType;
  }): Promise<AbdmExternalRecord>;
  listExternalRecords(
    clinicId: string,
    patientId?: string,
  ): Promise<AbdmExternalRecord[]>;
}

export const ABDM_REPOSITORY_TOKEN = Symbol('AbdmRepository');
