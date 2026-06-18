import { Injectable } from '@nestjs/common';
import {
  AbdmCareContextSource as DbCareContextSource,
  AbdmCareContextStatus,
  AbdmConsentRequestStatus,
  AbdmTransactionDirection,
  AbdmTransactionStatus,
  AbdmTransactionType,
  AppointmentStatus,
  ApprovalStatus,
  InvoiceStatus,
  LabTestOrderStatus,
  MedicalDocumentStatus,
  MedicalDocumentType,
} from '@workspace/db';
import type {
  AbdmCareContext,
  AbdmCareContextStatus as ContractCareContextStatus,
  AbdmCareContextSource,
  AbdmConsentRequest,
  AbdmExternalRecord,
  AbdmGatewayCallback,
  AbdmTransaction,
  AbdmTransactionDirection as ContractTransactionDirection,
  AbdmTransactionStatus as ContractTransactionStatus,
  AbdmTransactionType as ContractTransactionType,
  CreateAbdmConsentRequest,
  JsonValueSchemaType,
} from '@workspace/types';
import { jsonValueSchema } from '@workspace/types';
import { PrismaService } from '@/prisma/prisma.service';
import { toPrismaInputJsonValue } from '@/shared/common/json/to-prisma-input-json-value';
import type {
  AbdmCareContextWithBundle,
  AbdmPatientLookup,
  AbdmRepository,
  AbdmSourceRecord,
} from '@/domains/abdm/core/repositories/abdm.repository.interface';

function iso(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

function sourceToDb(source: AbdmCareContextSource): DbCareContextSource {
  return DbCareContextSource[source];
}

function transactionTypeToDb(
  type: ContractTransactionType,
): AbdmTransactionType {
  return AbdmTransactionType[type];
}

function transactionDirectionToDb(
  direction: ContractTransactionDirection,
): AbdmTransactionDirection {
  return AbdmTransactionDirection[direction];
}

function transactionStatusToDb(
  status: ContractTransactionStatus,
): AbdmTransactionStatus {
  return AbdmTransactionStatus[status];
}

function careContextStatusToDb(
  status: ContractCareContextStatus,
): AbdmCareContextStatus {
  return AbdmCareContextStatus[status];
}

type CareContextRow = {
  id: string;
  patientId: string;
  sourceType: DbCareContextSource;
  sourceId: string;
  referenceNumber: string;
  display: string;
  hiType: string;
  status: AbdmCareContextStatus;
  linkedAt: Date | null;
  lastSharedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type CareContextWithBundleRow = CareContextRow & {
  fhirBundle: unknown;
};

function mapCareContext(row: CareContextRow): AbdmCareContext {
  return {
    id: row.id,
    patientId: row.patientId,
    sourceType: row.sourceType,
    sourceId: row.sourceId,
    referenceNumber: row.referenceNumber,
    display: row.display,
    hiType: row.hiType,
    status: row.status,
    linkedAt: iso(row.linkedAt),
    lastSharedAt: iso(row.lastSharedAt),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapCareContextWithBundle(
  row: CareContextWithBundleRow,
): AbdmCareContextWithBundle {
  return {
    ...mapCareContext(row),
    fhirBundle: jsonValueSchema.parse(row.fhirBundle),
  };
}

function mapTransaction(row: {
  id: string;
  patientId: string | null;
  careContextId: string | null;
  type: AbdmTransactionType;
  direction: AbdmTransactionDirection;
  status: AbdmTransactionStatus;
  requestId: string | null;
  transactionId: string | null;
  correlationId: string | null;
  error: string | null;
  retryCount: number;
  nextRetryAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): AbdmTransaction {
  return {
    id: row.id,
    patientId: row.patientId,
    careContextId: row.careContextId,
    type: row.type,
    direction: row.direction,
    status: row.status,
    requestId: row.requestId,
    transactionId: row.transactionId,
    correlationId: row.correlationId,
    error: row.error,
    retryCount: row.retryCount,
    nextRetryAt: iso(row.nextRetryAt),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapConsent(row: {
  id: string;
  patientId: string;
  abhaAddress: string;
  purposeCode: string;
  purposeText: string;
  status: AbdmConsentRequestStatus;
  requestId: string | null;
  consentId: string | null;
  artefactId: string | null;
  requestedAt: Date | null;
  grantedAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): AbdmConsentRequest {
  return {
    id: row.id,
    patientId: row.patientId,
    abhaAddress: row.abhaAddress,
    purposeCode: row.purposeCode,
    purposeText: row.purposeText,
    status: row.status,
    requestId: row.requestId,
    consentId: row.consentId,
    artefactId: row.artefactId,
    requestedAt: iso(row.requestedAt),
    grantedAt: iso(row.grantedAt),
    expiresAt: iso(row.expiresAt),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapExternal(row: {
  id: string;
  patientId: string;
  consentRequestId: string | null;
  sourceHipId: string | null;
  careContextReference: string | null;
  hiType: string;
  receivedAt: Date;
}): AbdmExternalRecord {
  return {
    id: row.id,
    patientId: row.patientId,
    consentRequestId: row.consentRequestId,
    sourceHipId: row.sourceHipId,
    careContextReference: row.careContextReference,
    hiType: row.hiType,
    receivedAt: row.receivedAt.toISOString(),
  };
}

@Injectable()
export class PrismaAbdmRepository implements AbdmRepository {
  constructor(private readonly prisma: PrismaService) {}

  private readClient() {
    return this.prisma.getReadClient();
  }

  async isClinicAbdmEnabled(clinicId: string): Promise<boolean> {
    const clinic = await this.readClient().clinic.findUnique({
      where: { id: clinicId },
      select: { abdmEnabled: true },
    });
    return clinic?.abdmEnabled === true;
  }

  findPatient(
    clinicId: string,
    patientId: string,
  ): Promise<AbdmPatientLookup | null> {
    return this.readClient().patient.findFirst({
      where: { id: patientId, clinicId, deletedAt: null },
      select: { id: true, abhaAddress: true, abhaVerifiedAt: true },
    });
  }

  async findSourceRecord(
    clinicId: string,
    sourceType: AbdmCareContextSource,
    sourceId: string,
  ): Promise<AbdmSourceRecord | null> {
    if (sourceType === 'OP_CONSULTATION') {
      const row = await this.readClient().appointment.findFirst({
        where: { id: sourceId, clinicId, status: AppointmentStatus.COMPLETED },
        select: { patientId: true, startTime: true },
      });
      return row
        ? {
            patientId: row.patientId,
            display: `OP consultation ${row.startTime.toISOString().slice(0, 10)}`,
            hiType: 'OPConsultation',
            occurredAt: row.startTime,
          }
        : null;
    }

    if (sourceType === 'PRESCRIPTION') {
      const row = await this.readClient().prescription.findFirst({
        where: {
          id: sourceId,
          clinicId,
          approvalStatus: {
            in: [ApprovalStatus.APPROVED, ApprovalStatus.AUTO_APPROVED],
          },
        },
        select: { patientId: true, date: true },
      });
      return row
        ? {
            patientId: row.patientId,
            display: `Prescription ${row.date.toISOString().slice(0, 10)}`,
            hiType: 'Prescription',
            occurredAt: row.date,
          }
        : null;
    }

    if (sourceType === 'DIAGNOSTIC_REPORT') {
      const row = await this.readClient().labTestOrder.findFirst({
        where: {
          id: sourceId,
          clinicId,
          status: {
            in: [LabTestOrderStatus.RESULT_READY, LabTestOrderStatus.COMPLETED],
          },
        },
        select: {
          patientId: true,
          completedAt: true,
          resultUploadedAt: true,
          createdAt: true,
          labTest: { select: { name: true } },
        },
      });
      return row
        ? {
            patientId: row.patientId,
            display: `${row.labTest.name} diagnostic report`,
            hiType: 'DiagnosticReport',
            occurredAt:
              row.completedAt ?? row.resultUploadedAt ?? row.createdAt,
          }
        : null;
    }

    if (
      sourceType === 'DISCHARGE_SUMMARY' ||
      sourceType === 'HEALTH_DOCUMENT'
    ) {
      const row = await this.readClient().medicalDocument.findFirst({
        where: {
          id: sourceId,
          clinicId,
          status: MedicalDocumentStatus.SIGNED,
          ...(sourceType === 'DISCHARGE_SUMMARY'
            ? { type: MedicalDocumentType.DISCHARGE_SUMMARY }
            : { type: { not: MedicalDocumentType.DISCHARGE_SUMMARY } }),
        },
        select: {
          patientId: true,
          title: true,
          type: true,
          signedAt: true,
          createdAt: true,
        },
      });
      return row
        ? {
            patientId: row.patientId,
            display: row.title,
            hiType:
              row.type === MedicalDocumentType.DISCHARGE_SUMMARY
                ? 'DischargeSummary'
                : 'HealthDocumentRecord',
            occurredAt: row.signedAt ?? row.createdAt,
          }
        : null;
    }

    const row = await this.readClient().invoice.findFirst({
      where: { id: sourceId, clinicId, status: InvoiceStatus.PAID },
      select: {
        id: true,
        patientId: true,
        invoiceNumber: true,
        issuedAt: true,
        createdAt: true,
      },
    });
    return row
      ? {
          patientId: row.patientId,
          display: `Invoice ${row.invoiceNumber ?? row.id}`,
          hiType: 'Invoice',
          occurredAt: row.issuedAt ?? row.createdAt,
        }
      : null;
  }

  async upsertCareContext(input: {
    clinicId: string;
    patientId: string;
    sourceType: AbdmCareContextSource;
    sourceId: string;
    referenceNumber: string;
    display: string;
    hiType: string;
    fhirBundle: JsonValueSchemaType;
  }): Promise<AbdmCareContext> {
    const row = await this.prisma.abdmCareContext.upsert({
      where: {
        clinicId_sourceType_sourceId: {
          clinicId: input.clinicId,
          sourceType: sourceToDb(input.sourceType),
          sourceId: input.sourceId,
        },
      },
      update: {
        display: input.display,
        hiType: input.hiType,
        fhirBundle: toPrismaInputJsonValue(input.fhirBundle),
      },
      create: {
        clinicId: input.clinicId,
        patientId: input.patientId,
        sourceType: sourceToDb(input.sourceType),
        sourceId: input.sourceId,
        referenceNumber: input.referenceNumber,
        display: input.display,
        hiType: input.hiType,
        fhirBundle: toPrismaInputJsonValue(input.fhirBundle),
      },
    });
    return mapCareContext(row);
  }

  async listCareContexts(
    clinicId: string,
    patientId?: string,
  ): Promise<AbdmCareContext[]> {
    const rows = await this.readClient().abdmCareContext.findMany({
      where: { clinicId, ...(patientId ? { patientId } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return rows.map(mapCareContext);
  }

  async findCareContext(
    clinicId: string,
    id: string,
  ): Promise<AbdmCareContext | null> {
    const row = await this.readClient().abdmCareContext.findFirst({
      where: { id, clinicId },
    });
    return row ? mapCareContext(row) : null;
  }

  async findCareContextByReference(
    clinicId: string,
    referenceNumber: string,
  ): Promise<AbdmCareContextWithBundle | null> {
    const row = await this.readClient().abdmCareContext.findFirst({
      where: { clinicId, referenceNumber },
    });
    return row ? mapCareContextWithBundle(row) : null;
  }

  async markCareContextLinked(
    clinicId: string,
    id: string,
    linkedAt: Date,
  ): Promise<AbdmCareContext> {
    const row = await this.updateTenantCareContext(clinicId, id, {
      data: { status: AbdmCareContextStatus.LINKED, linkedAt },
    });
    return mapCareContext(row);
  }

  async markCareContextShared(
    clinicId: string,
    id: string,
    sharedAt: Date,
  ): Promise<AbdmCareContext> {
    const row = await this.updateTenantCareContext(clinicId, id, {
      data: { status: AbdmCareContextStatus.SHARED, lastSharedAt: sharedAt },
    });
    return mapCareContext(row);
  }

  async updateCareContextStatus(
    clinicId: string,
    id: string,
    status: ContractCareContextStatus,
  ): Promise<AbdmCareContext> {
    const row = await this.updateTenantCareContext(clinicId, id, {
      data: { status: careContextStatusToDb(status) },
    });
    return mapCareContext(row);
  }

  private async updateTenantCareContext(
    clinicId: string,
    id: string,
    update: {
      data: {
        status: AbdmCareContextStatus;
        linkedAt?: Date;
        lastSharedAt?: Date;
      };
    },
  ) {
    const existing = await this.readClient().abdmCareContext.findFirst({
      where: { id, clinicId },
      select: { id: true },
    });
    if (!existing) {
      throw new Error('ABDM care context not found');
    }
    return this.prisma.abdmCareContext.update({
      where: { id },
      data: update.data,
    });
  }

  async createTransaction(input: {
    clinicId: string;
    patientId?: string;
    careContextId?: string;
    type: ContractTransactionType;
    direction: ContractTransactionDirection;
    status: ContractTransactionStatus;
    requestId?: string;
    transactionId?: string;
    correlationId?: string;
    payload?: JsonValueSchemaType;
    error?: string;
  }): Promise<AbdmTransaction> {
    const row = await this.prisma.abdmTransaction.create({
      data: {
        clinicId: input.clinicId,
        patientId: input.patientId,
        careContextId: input.careContextId,
        type: transactionTypeToDb(input.type),
        direction: transactionDirectionToDb(input.direction),
        status: transactionStatusToDb(input.status),
        requestId: input.requestId,
        transactionId: input.transactionId,
        correlationId: input.correlationId,
        payload:
          input.payload === undefined
            ? undefined
            : toPrismaInputJsonValue(input.payload),
        error: input.error,
      },
    });
    return mapTransaction(row);
  }

  async listTransactions(
    clinicId: string,
    statuses?: ContractTransactionStatus[],
  ): Promise<AbdmTransaction[]> {
    const rows = await this.readClient().abdmTransaction.findMany({
      where: {
        clinicId,
        ...(statuses?.length
          ? {
              status: {
                in: statuses.map(transactionStatusToDb),
              },
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return rows.map(mapTransaction);
  }

  async createConsentRequest(
    clinicId: string,
    input: CreateAbdmConsentRequest,
    requestId: string,
    requestedAt: Date,
  ): Promise<AbdmConsentRequest> {
    const row = await this.prisma.abdmConsentRequest.create({
      data: {
        clinicId,
        patientId: input.patientId,
        abhaAddress: input.abhaAddress,
        purposeCode: input.purposeCode,
        purposeText: input.purposeText,
        status: AbdmConsentRequestStatus.REQUESTED,
        requestId,
        requestedAt,
      },
    });
    return mapConsent(row);
  }

  async listConsentRequests(
    clinicId: string,
    patientId?: string,
  ): Promise<AbdmConsentRequest[]> {
    const rows = await this.readClient().abdmConsentRequest.findMany({
      where: { clinicId, ...(patientId ? { patientId } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return rows.map(mapConsent);
  }

  async updateConsentFromCallback(input: {
    clinicId: string;
    requestId?: string;
    consentId?: string;
    status: 'GRANTED' | 'DENIED' | 'EXPIRED' | 'REVOKED' | 'FAILED';
    artefactId?: string;
    rawArtifact?: JsonValueSchemaType;
    at: Date;
  }): Promise<AbdmConsentRequest | null> {
    if (!input.requestId && !input.consentId) return null;

    const existing = await this.readClient().abdmConsentRequest.findFirst({
      where: {
        clinicId: input.clinicId,
        OR: [
          ...(input.requestId ? [{ requestId: input.requestId }] : []),
          ...(input.consentId ? [{ consentId: input.consentId }] : []),
        ],
      },
      select: { id: true },
    });
    if (!existing) return null;

    const row = await this.prisma.abdmConsentRequest.update({
      where: { id: existing.id },
      data: {
        status: AbdmConsentRequestStatus[input.status],
        consentId: input.consentId,
        artefactId: input.artefactId,
        grantedAt: input.status === 'GRANTED' ? input.at : undefined,
        rawArtifact:
          input.rawArtifact === undefined
            ? undefined
            : toPrismaInputJsonValue(input.rawArtifact),
      },
    });
    return mapConsent(row);
  }

  recordCallback(
    clinicId: string,
    type: ContractTransactionType,
    callback: AbdmGatewayCallback,
  ): Promise<AbdmTransaction> {
    const payload = jsonValueSchema.parse({
      status: callback.status,
      dataPushUrlPresent: Boolean(callback.dataPushUrl),
      hiType: callback.hiType,
      sourceHipId: callback.sourceHipId,
      payload: toPrismaInputJsonValue(callback.payload ?? null),
    });

    return this.createTransaction({
      clinicId,
      patientId: callback.patientId,
      type,
      direction: 'INBOUND',
      status: 'ACKNOWLEDGED',
      requestId: callback.requestId,
      transactionId: callback.transactionId,
      correlationId: callback.careContextReference,
      payload,
    });
  }

  async recordExternalRecord(input: {
    clinicId: string;
    patientId: string;
    consentRequestId?: string;
    sourceHipId?: string;
    careContextReference?: string;
    hiType: string;
    fhirBundle?: JsonValueSchemaType;
  }): Promise<AbdmExternalRecord> {
    const row = await this.prisma.abdmExternalRecord.create({
      data: {
        clinicId: input.clinicId,
        patientId: input.patientId,
        consentRequestId: input.consentRequestId,
        sourceHipId: input.sourceHipId,
        careContextReference: input.careContextReference,
        hiType: input.hiType,
        fhirBundle:
          input.fhirBundle === undefined
            ? undefined
            : toPrismaInputJsonValue(input.fhirBundle),
      },
    });
    return mapExternal(row);
  }

  async listExternalRecords(
    clinicId: string,
    patientId?: string,
  ): Promise<AbdmExternalRecord[]> {
    const rows = await this.readClient().abdmExternalRecord.findMany({
      where: { clinicId, ...(patientId ? { patientId } : {}) },
      orderBy: { receivedAt: 'desc' },
      take: 100,
    });
    return rows.map(mapExternal);
  }
}
