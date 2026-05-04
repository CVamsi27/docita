import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import * as Papa from 'papaparse';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { Gender, InvoiceStatus, Specialization } from '@workspace/db';
import type { BulkImportEntityType } from '@workspace/types';
import * as bcrypt from 'bcrypt';
import { nanoid } from 'nanoid';

export type { BulkImportEntityType };

interface BulkImportJobData {
  jobId: string;
  clinicId: string;
  userId: string;
  entityType: BulkImportEntityType;
  fileName: string;
  fileBuffer: Buffer;
  totalRows: number;
}

type BulkImportValue = string | number | boolean | null | undefined;
type BulkImportRow = Record<string, BulkImportValue>;

const SPECIALIZATIONS = new Set<string>(Object.values(Specialization));

interface ImportError {
  rowNumber: number;
  error: string;
  value: BulkImportRow;
}

@Injectable()
export class BulkImportService {
  private readonly logger = new Logger(BulkImportService.name);
  private lastImportTimes: Map<string, number> = new Map();

  constructor(
    private prisma: PrismaService,
    private configService: AppConfigService,
  ) {}

  async getJobStatus(
    jobId: string,
    clinicId: string,
  ): Promise<{
    jobId: string;
    status: string;
    entityType: string;
    fileName: string;
    totalRows: number;
    processedRows: number;
    successRows: number;
    failedRows: number;
    skippedRows: number;
    errors: Array<{ rowNumber: number; error: string }>;
    errorSummary: string | null;
    startedAt: Date | null;
    completedAt: Date | null;
    durationMs: number | null;
  }> {
    const job = await this.prisma.bulkImportJob.findFirst({
      where: { id: jobId, clinicId },
    });
    if (!job) {
      throw new NotFoundException('Import job not found');
    }
    const errors = Array.isArray(job.errors)
      ? (job.errors as Array<{ rowNumber: number; error: string }>)
      : [];
    return {
      jobId: job.id,
      status: job.status,
      entityType: job.entityType,
      fileName: job.fileName,
      totalRows: job.totalRows,
      processedRows: job.processedRows,
      successRows: job.successRows,
      failedRows: job.failedRows,
      skippedRows: job.skippedRows,
      errors,
      errorSummary: job.errorSummary,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      durationMs: job.duration,
    };
  }

  async startImport(
    clinicId: string,
    userId: string,
    entityType: BulkImportEntityType,
    fileName: string,
    fileBuffer: Buffer,
  ): Promise<{ jobId: string; status: string; totalRows: number }> {
    try {
      const lastImportTime = this.lastImportTimes.get(clinicId);
      const { maxFileSize, maxRows, rateLimitInterval } =
        this.configService.getBulkImportConfig();

      if (
        lastImportTime &&
        Date.now() - lastImportTime < rateLimitInterval * 1000
      ) {
        throw new BadRequestException(
          `Please wait ${rateLimitInterval} seconds before starting another import`,
        );
      }

      if (fileBuffer.length > maxFileSize) {
        throw new BadRequestException(
          `File size exceeds limit of ${maxFileSize / 1024 / 1024}MB`,
        );
      }

      const csvData = fileBuffer.toString('utf-8');
      const { data: rows } = Papa.parse(csvData, {
        header: true,
        skipEmptyLines: true,
      });

      if (!rows || rows.length === 0) {
        throw new BadRequestException('CSV file is empty');
      }

      if (rows.length > maxRows) {
        throw new BadRequestException(
          `Number of rows (${rows.length}) exceeds maximum limit of ${maxRows}`,
        );
      }

      if (!this.isValidEntityType(entityType)) {
        throw new BadRequestException(
          `Invalid entity type: ${String(entityType)}`,
        );
      }

      const jobId = nanoid();

      await this.prisma.bulkImportJob.create({
        data: {
          id: jobId,
          clinicId,
          userId,
          entityType,
          fileName,
          fileSize: fileBuffer.length,
          originalKey: `inline:${jobId}`,
          status: 'QUEUED',
          totalRows: rows.length,
          processedRows: 0,
          successRows: 0,
          failedRows: 0,
          skippedRows: 0,
          errors: [],
        },
      });

      this.logger.log(
        `Starting bulk import: ${jobId} | Entity: ${entityType} | Rows: ${rows.length} | User: ${userId}`,
      );

      const jobData: BulkImportJobData = {
        jobId,
        clinicId,
        userId,
        entityType,
        fileName,
        fileBuffer,
        totalRows: rows.length,
      };

      this.lastImportTimes.set(clinicId, Date.now());
      this.scheduleImport(jobData);

      return {
        jobId,
        status: 'QUEUED',
        totalRows: rows.length,
      };
    } catch (error) {
      this.logger.error(
        `Failed to start bulk import: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  private scheduleImport(jobData: BulkImportJobData): void {
    setImmediate(() => {
      void this.processImport(jobData).catch((error) => {
        this.logger.error(
          `Error processing scheduled import job ${jobData.jobId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          error instanceof Error ? error.stack : undefined,
        );
        void this.prisma.bulkImportJob
          .update({
            where: { id: jobData.jobId },
            data: {
              status: 'FAILED',
              errorSummary:
                error instanceof Error ? error.message : 'Unknown error',
              completedAt: new Date(),
            },
          })
          .catch(() => {});
      });
    });
  }

  async processImport(jobData: BulkImportJobData): Promise<void> {
    const { jobId, clinicId, entityType, fileBuffer, totalRows } = jobData;
    const startedAtMs = Date.now();

    await this.prisma.bulkImportJob.update({
      where: { id: jobId },
      data: {
        status: 'PROCESSING',
        startedAt: new Date(),
      },
    });

    const errors: ImportError[] = [];
    let successCount = 0;

    try {
      const csvData = fileBuffer.toString('utf-8');
      const { data: rows } = Papa.parse(csvData, {
        header: true,
        skipEmptyLines: true,
      });

      const batchSize = 1000;
      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize) as BulkImportRow[];
        const batchResults = await this.processBatch(
          entityType,
          batch,
          clinicId,
          i,
        );

        successCount += batchResults.successCount;
        errors.push(...batchResults.errors);

        await this.prisma.bulkImportJob.update({
          where: { id: jobId },
          data: {
            processedRows: Math.min(i + batch.length, totalRows),
            successRows: successCount,
            failedRows: errors.length,
            errors: errors.map((e) => ({
              rowNumber: e.rowNumber,
              error: e.error,
            })),
          },
        });
      }

      const failureCount = errors.length;
      const status =
        failureCount === totalRows
          ? 'FAILED'
          : failureCount > 0
            ? 'PARTIALLY_COMPLETED'
            : 'COMPLETED';

      await this.prisma.bulkImportJob.update({
        where: { id: jobId },
        data: {
          status,
          processedRows: totalRows,
          successRows: successCount,
          failedRows: failureCount,
          errors: errors.map((e) => ({
            rowNumber: e.rowNumber,
            error: e.error,
          })),
          errorSummary:
            failureCount > 0
              ? `${failureCount} row(s) failed during import`
              : null,
          completedAt: new Date(),
          duration: Date.now() - startedAtMs,
        },
      });

      this.logger.log(
        `Import job ${jobId} completed: ${successCount} success, ${failureCount} failed`,
      );
    } catch (error) {
      await this.prisma.bulkImportJob.update({
        where: { id: jobId },
        data: {
          status: 'FAILED',
          errorSummary:
            error instanceof Error ? error.message : 'Unknown error',
          completedAt: new Date(),
          duration: Date.now() - startedAtMs,
          errors: errors.map((e) => ({
            rowNumber: e.rowNumber,
            error: e.error,
          })),
        },
      });
      throw error;
    }
  }

  private async processBatch(
    entityType: BulkImportEntityType,
    rows: BulkImportRow[],
    clinicId: string,
    startRowNumber: number,
  ): Promise<{ successCount: number; errors: ImportError[] }> {
    const errors: ImportError[] = [];
    let successCount = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = startRowNumber + i + 2;

      try {
        const validation = this.validateRow(entityType, row);
        if (!validation.valid) {
          throw new Error(validation.error);
        }

        switch (entityType) {
          case 'PATIENT':
            await this.importPatient(row, clinicId);
            break;
          case 'PRESCRIPTION':
            await this.importPrescription(row, clinicId);
            break;
          case 'DOCTOR':
            await this.importDoctor(row, clinicId);
            break;
          case 'LAB_TEST':
            await this.importLabTest(row, clinicId);
            break;
          case 'INVENTORY':
            await this.importInventory(row, clinicId);
            break;
        }

        successCount++;
      } catch (error) {
        errors.push({
          rowNumber,
          error: error instanceof Error ? error.message : 'Unknown error',
          value: row,
        });
      }
    }

    return { successCount, errors };
  }

  private getString(row: BulkImportRow, key: string): string {
    const value = row[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
    throw new Error(`Missing ${key}`);
  }

  private getOptionalString(
    row: BulkImportRow,
    key: string,
  ): string | undefined {
    const value = row[key];
    if (value === null || value === undefined) {
      return undefined;
    }
    return String(value);
  }

  private getGender(row: BulkImportRow): Gender {
    const value = this.getOptionalString(row, 'gender');
    if (
      value === Gender.MALE ||
      value === Gender.FEMALE ||
      value === Gender.OTHER
    ) {
      return value;
    }
    return Gender.OTHER;
  }

  private getSpecialization(row: BulkImportRow): Specialization | undefined {
    const value = this.getOptionalString(row, 'specialization');
    if (!value || !SPECIALIZATIONS.has(value)) {
      return undefined;
    }
    return value as Specialization;
  }

  private validateRow(entityType: BulkImportEntityType, row: BulkImportRow) {
    const validators: Record<
      BulkImportEntityType,
      (row: BulkImportRow) => { valid: boolean; error?: string }
    > = {
      PATIENT: (r) => {
        if (!r.firstName || !r.lastName) {
          return { valid: false, error: 'Missing firstName or lastName' };
        }
        if (!r.phoneNumber) {
          return { valid: false, error: 'Missing phoneNumber' };
        }
        return { valid: true };
      },
      PRESCRIPTION: (r) => {
        if (!r.appointmentId) {
          return { valid: false, error: 'Missing appointmentId' };
        }
        return { valid: true };
      },
      DOCTOR: (r) => {
        if (!r.name || !r.email) {
          return { valid: false, error: 'Missing name or email' };
        }
        return { valid: true };
      },
      LAB_TEST: (r) => {
        if (!r.testName) {
          return { valid: false, error: 'Missing testName' };
        }
        return { valid: true };
      },
      INVENTORY: (r) => {
        if (!r.itemName) {
          return { valid: false, error: 'Missing itemName' };
        }
        return { valid: true };
      },
    };

    return validators[entityType](row);
  }

  private async importPatient(
    row: BulkImportRow,
    clinicId: string,
  ): Promise<void> {
    const firstName = this.getString(row, 'firstName');
    const lastName = this.getString(row, 'lastName');
    const phoneNumber = this.getString(row, 'phoneNumber');
    const email = this.getOptionalString(row, 'email');
    const dateOfBirthRaw = row.dateOfBirth;
    const dateOfBirth =
      typeof dateOfBirthRaw === 'string' || typeof dateOfBirthRaw === 'number'
        ? new Date(dateOfBirthRaw)
        : new Date();

    if (email) {
      const existing = await this.prisma.patient.findFirst({
        where: { email },
      });
      if (existing) {
        throw new Error('Patient email already exists');
      }
    }

    const patient = await this.prisma.patient.create({
      data: {
        firstName,
        lastName,
        phoneNumber,
        email,
        dateOfBirth,
        bloodGroup: this.getOptionalString(row, 'bloodGroup'),
        address: this.getOptionalString(row, 'address'),
        gender: this.getGender(row),
        clinicId,
      },
    });

    const invoiceTotalRaw = row.invoiceTotal ?? row.invoiceGrandTotal;
    if (invoiceTotalRaw !== undefined && invoiceTotalRaw !== null) {
      const total = parseFloat(String(invoiceTotalRaw).trim());
      if (!Number.isNaN(total) && total > 0) {
        let items: unknown = [
          {
            description: 'Imported charges',
            quantity: 1,
            unitPrice: total,
            amount: total,
          },
        ];
        const rawItems = row.invoiceLineItems ?? row.invoiceItems;
        if (rawItems) {
          try {
            const parsed = JSON.parse(String(rawItems)) as unknown;
            if (Array.isArray(parsed) && parsed.length > 0) {
              items = parsed;
            }
          } catch {
            /* keep default single line */
          }
        }
        await this.prisma.invoice.create({
          data: {
            patientId: patient.id,
            clinicId,
            total,
            subtotal: total,
            grandTotal: total,
            taxTotal: 0,
            discountTotal: 0,
            status: InvoiceStatus.PENDING,
            items: items as object,
          },
        });
      }
    }
  }

  private async importPrescription(
    row: BulkImportRow,
    clinicId: string,
  ): Promise<void> {
    const appointmentId = this.getString(row, 'appointmentId');

    const apt = await this.prisma.appointment.findFirst({
      where: { id: appointmentId, clinicId },
      include: { prescription: true },
    });
    if (!apt) {
      throw new Error('Appointment not found for this clinic');
    }
    if (apt.prescription) {
      throw new Error('Appointment already has a prescription');
    }

    const instructions = this.getOptionalString(row, 'instructions');

    await this.prisma.prescription.create({
      data: {
        appointmentId: apt.id,
        patientId: apt.patientId,
        doctorId: apt.doctorId,
        instructions: instructions ?? null,
      },
    });
  }

  private async importDoctor(
    row: BulkImportRow,
    clinicId: string,
  ): Promise<void> {
    const email = this.getString(row, 'email');
    const name = this.getString(row, 'name');

    const existing = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existing) {
      throw new Error('Doctor email already exists');
    }

    const generatedPassword = nanoid(32);
    const passwordHash = await bcrypt.hash(generatedPassword, 10);

    await this.prisma.user.create({
      data: {
        email,
        name,
        password: passwordHash,
        role: 'DOCTOR',
        clinicId,
        specialization: this.getSpecialization(row),
        registrationNumber: this.getOptionalString(row, 'registrationNumber'),
        phoneNumber: this.getOptionalString(row, 'phoneNumber'),
      },
    });
  }

  private async importLabTest(
    row: BulkImportRow,
    clinicId: string,
  ): Promise<void> {
    const name = this.getString(row, 'testName');
    const code =
      this.getOptionalString(row, 'testCode')?.trim() ||
      name.replace(/\s+/g, '-').toUpperCase();
    const category = this.getOptionalString(row, 'category') ?? 'General';
    const costRaw = row.cost;
    const price =
      typeof costRaw === 'number'
        ? costRaw
        : parseFloat(String(costRaw ?? '').trim());
    await this.prisma.labTest.create({
      data: {
        clinicId,
        name,
        code,
        category,
        description: this.getOptionalString(row, 'description'),
        price: Number.isFinite(price) ? price : undefined,
      },
    });
  }

  private async importInventory(
    row: BulkImportRow,
    clinicId: string,
  ): Promise<void> {
    const name = this.getString(row, 'itemName');
    const category = this.getOptionalString(row, 'category') ?? 'General';
    const qtyRaw = row.quantity;
    const quantity =
      typeof qtyRaw === 'number'
        ? qtyRaw
        : parseInt(String(qtyRaw ?? '0').trim(), 10) || 0;
    const reorderRaw = row.reorderLevel;
    const minQuantity =
      typeof reorderRaw === 'number'
        ? reorderRaw
        : parseInt(String(reorderRaw ?? '10').trim(), 10) || 10;
    const costRaw = row.cost;
    const purchasePrice =
      typeof costRaw === 'number'
        ? costRaw
        : parseFloat(String(costRaw ?? '').trim());

    await this.prisma.inventoryItem.create({
      data: {
        clinicId,
        name,
        category,
        quantity,
        minQuantity,
        purchasePrice: Number.isFinite(purchasePrice)
          ? purchasePrice
          : undefined,
      },
    });
  }

  private isValidEntityType(
    entityType: string,
  ): entityType is BulkImportEntityType {
    return (
      ['PATIENT', 'PRESCRIPTION', 'DOCTOR', 'LAB_TEST', 'INVENTORY'] as const
    ).includes(entityType as BulkImportEntityType);
  }

  getImportTemplate(entityType: BulkImportEntityType): Record<string, string> {
    const templates: Record<BulkImportEntityType, Record<string, string>> = {
      PATIENT: {
        firstName: '',
        lastName: '',
        phoneNumber: '',
        email: '',
        dateOfBirth: '',
        bloodGroup: '',
        gender: '',
        address: '',
        invoiceTotal: '',
        invoiceLineItems: '',
      },
      PRESCRIPTION: {
        appointmentId: '',
        instructions: '',
      },
      DOCTOR: {
        name: '',
        email: '',
        phone: '',
        specialization: '',
        registrationNumber: '',
      },
      LAB_TEST: {
        testName: '',
        testCode: '',
        category: '',
        description: '',
        cost: '',
        turnaroundTime: '',
      },
      INVENTORY: {
        itemName: '',
        quantity: '',
        cost: '',
        reorderLevel: '',
        category: '',
      },
    };

    return templates[entityType];
  }

  generateCSVTemplate(entityType: BulkImportEntityType): string {
    const template = this.getImportTemplate(entityType);
    const headers = Object.keys(template);
    return headers.join(',');
  }
}
