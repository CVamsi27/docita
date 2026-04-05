import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';
import * as Papa from 'papaparse';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { Gender, Specialization } from '@workspace/db';
import * as bcrypt from 'bcrypt';
import { nanoid } from 'nanoid';

export type BulkImportEntityType =
  | 'PATIENT'
  | 'PRESCRIPTION'
  | 'DOCTOR'
  | 'LAB_TEST'
  | 'INVENTORY';

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
    @InjectQueue('bulk-import') private bulkImportQueue: Queue,
  ) {}

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

      const randomSuffix = Math.random().toString(36).substr(2, 9);
      const jobId = `import_${Date.now()}_${randomSuffix}`;

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

      await this.bulkImportQueue.add('process-import', jobData, {
        attempts: 1,
        timeout: 60000 * 10,
      });

      this.lastImportTimes.set(clinicId, Date.now());

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

  async processImport(jobData: BulkImportJobData): Promise<void> {
    try {
      const {
        jobId,
        clinicId,
        userId: _userId,
        entityType,
        fileBuffer,
        totalRows,
      } = jobData;

      this.logger.log(
        `Processing import job ${jobId} for ${entityType} (${totalRows} rows)`,
      );

      const csvData = fileBuffer.toString('utf-8');
      const { data: rows } = Papa.parse(csvData, {
        header: true,
        skipEmptyLines: true,
      });

      const errors: ImportError[] = [];
      let successCount = 0;

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

        const progress = Math.round(((i + batch.length) / totalRows) * 100);
        this.logger.debug(
          `Import progress: ${progress}% (${i + batch.length}/${totalRows})`,
        );
      }

      const failureCount = totalRows - successCount;
      this.logger.log(
        `Import job ${jobId} completed: ${successCount} success, ${failureCount} failed`,
      );

      const result = {
        jobId,
        entityType,
        totalRows,
        successRows: successCount,
        failedRows: failureCount,
        errors,
        completedAt: new Date(),
      };

      this.logger.debug(`Import result: ${JSON.stringify(result)}`);
    } catch (error) {
      this.logger.error(
        `Error processing import job: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
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
            this.importLabTest(row, clinicId);
            break;
          case 'INVENTORY':
            this.importInventory(row, clinicId);
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
      PATIENT: (row) => {
        if (!row.firstName || !row.lastName) {
          return { valid: false, error: 'Missing firstName or lastName' };
        }
        if (!row.phoneNumber) {
          return { valid: false, error: 'Missing phoneNumber' };
        }
        return { valid: true };
      },
      PRESCRIPTION: (row) => {
        if (!row.patientId || !row.doctorId) {
          return { valid: false, error: 'Missing patientId or doctorId' };
        }
        return { valid: true };
      },
      DOCTOR: (row) => {
        if (!row.name || !row.email) {
          return { valid: false, error: 'Missing name or email' };
        }
        return { valid: true };
      },
      LAB_TEST: (row) => {
        if (!row.testName || !row.testCode) {
          return { valid: false, error: 'Missing testName or testCode' };
        }
        return { valid: true };
      },
      INVENTORY: (row) => {
        if (!row.itemName) {
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

    await this.prisma.patient.create({
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
  }

  private async importPrescription(
    row: BulkImportRow,
    _clinicId: string,
  ): Promise<void> {
    const patientId = this.getString(row, 'patientId');
    const doctorId = this.getString(row, 'doctorId');

    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
    });
    if (!patient) {
      throw new Error('Patient not found');
    }

    const doctor = await this.prisma.user.findUnique({
      where: { id: doctorId },
    });
    if (!doctor) {
      throw new Error('Doctor not found');
    }

    this.logger.warn(
      'Skipping prescription import: bulk import requires existing appointments',
    );
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

  private importLabTest(row: BulkImportRow, _clinicId: string): void {
    this.logger.debug(`Importing lab test: ${row.testName}`);
  }

  private importInventory(row: BulkImportRow, _clinicId: string): void {
    this.logger.debug(`Importing inventory item: ${row.itemName}`);
  }

  private isValidEntityType(
    entityType: string,
  ): entityType is BulkImportEntityType {
    return [
      'PATIENT',
      'PRESCRIPTION',
      'DOCTOR',
      'LAB_TEST',
      'INVENTORY',
    ].includes(entityType);
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
      },
      PRESCRIPTION: {
        patientId: '',
        doctorId: '',
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
