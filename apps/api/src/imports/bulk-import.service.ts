import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';
import * as Papa from 'papaparse';

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

interface ImportError {
  rowNumber: number;
  error: string;
  value: Record<string, any>;
}

@Injectable()
export class BulkImportService {
  private readonly logger = new Logger(BulkImportService.name);
  private readonly maxFileSize = parseInt(
    process.env.BULK_IMPORT_MAX_FILE_SIZE || '52428800',
  ); // 50MB
  private readonly maxRows = parseInt(
    process.env.BULK_IMPORT_MAX_ROWS || '100000',
  );
  private readonly rateLimitInterval = parseInt(
    process.env.BULK_IMPORT_RATE_LIMIT_INTERVAL || '300',
  ); // seconds

  private lastImportTimes: Map<string, number> = new Map();

  constructor(
    private prisma: PrismaService,
    @InjectQueue('bulk-import') private bulkImportQueue: Queue,
  ) {}

  /**
   * Start a bulk import job
   */
  async startImport(
    clinicId: string,
    userId: string,
    entityType: BulkImportEntityType,
    fileName: string,
    fileBuffer: Buffer,
  ): Promise<{ jobId: string; status: string; totalRows: number }> {
    try {
      // Rate limiting check
      const lastImportTime = this.lastImportTimes.get(clinicId);
      if (
        lastImportTime &&
        Date.now() - lastImportTime < this.rateLimitInterval * 1000
      ) {
        throw new BadRequestException(
          `Please wait ${this.rateLimitInterval} seconds before starting another import`,
        );
      }

      // File size validation
      if (fileBuffer.length > this.maxFileSize) {
        throw new BadRequestException(
          `File size exceeds limit of ${this.maxFileSize / 1024 / 1024}MB`,
        );
      }

      // Parse CSV
      const csvData = fileBuffer.toString('utf-8');
      const { data: rows } = Papa.parse(csvData, {
        header: true,
        skipEmptyLines: true,
      });

      if (!rows || rows.length === 0) {
        throw new BadRequestException('CSV file is empty');
      }

      if (rows.length > this.maxRows) {
        throw new BadRequestException(
          `Number of rows (${rows.length}) exceeds maximum limit of ${this.maxRows}`,
        );
      }

      // Validate entity type
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
        timeout: 60000 * 10, // 10 minutes timeout
      });

      // Update rate limit tracking
      this.lastImportTimes.set(clinicId, Date.now());

      return {
        jobId,
        status: 'QUEUED',
        totalRows: rows.length,
      };
    } catch (error) {
      this.logger.error(
        `Failed to start bulk import: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   */
  async processImport(jobData: BulkImportJobData): Promise<void> {
    try {
      const { jobId, clinicId, userId, entityType, fileBuffer, totalRows } =
        jobData;

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
        const batch = rows.slice(i, i + batchSize);
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
        `Error processing import job: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Process a batch of rows
   */
  private async processBatch(
    entityType: BulkImportEntityType,
    rows: any[],
    clinicId: string,
    startRowNumber: number,
  ): Promise<{ successCount: number; errors: ImportError[] }> {
    const errors: ImportError[] = [];
    let successCount = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = startRowNumber + i + 2; // +2 for header row and 1-indexing

      try {
        // Validate row
        const validation = this.validateRow(entityType, row);
        if (!validation.valid) {
          throw new Error(validation.error);
        }

        // Process based on entity type
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
          error: error.message,
          value: row,
        });
      }
    }

    return { successCount, errors };
  }

  /**
   * Validate row data
   */
  private validateRow(
    entityType: BulkImportEntityType,
    row: Record<string, any>,
  ) {
    const validators: Record<
      BulkImportEntityType,
      (row: any) => { valid: boolean; error?: string }
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

  /**
   * Import patient row
   */
  private async importPatient(
    row: Record<string, any>,
    clinicId: string,
  ): Promise<void> {
    // Validate email uniqueness if provided
    if (row.email) {
      const existing = await this.prisma.patient.findFirst({
        where: { email: row.email },
      });
      if (existing) {
        throw new Error(`Email already exists: ${row.email}`);
      }
    }

    await this.prisma.patient.create({
      data: {
        firstName: row.firstName,
        lastName: row.lastName,
        phoneNumber: row.phoneNumber,
        email: row.email,
        dateOfBirth: row.dateOfBirth ? new Date(row.dateOfBirth) : new Date(),
        bloodGroup: row.bloodGroup,
        address: row.address,
        gender: row.gender || 'OTHER',
        clinicId,
      },
    });
  }

  /**
   * Import prescription row
   * Note: Prescriptions require an associated appointment (appointmentId is unique constraint)
   * For bulk import, we skip prescriptions as they must be linked to appointments
   */
  private async importPrescription(
    row: Record<string, any>,
    clinicId: string,
  ): Promise<void> {
    // Verify patient exists
    const patient = await this.prisma.patient.findUnique({
      where: { id: row.patientId },
    });
    if (!patient) {
      throw new Error(`Patient not found: ${row.patientId}`);
    }

    // Verify doctor exists
    const doctor = await this.prisma.user.findUnique({
      where: { id: row.doctorId },
    });
    if (!doctor) {
      throw new Error(`Doctor not found: ${row.doctorId}`);
    }

    // For bulk import without appointments, we skip prescription creation
    // Prescriptions must be linked to appointments (appointmentId is unique constraint)
    // Users should create appointments first, then prescriptions through normal workflow
    this.logger.warn(
      `Skipping prescription import for patient ${row.patientId}: bulk import requires existing appointments`,
    );
  }

  /**
   * Import doctor row
   */
  private async importDoctor(
    row: Record<string, any>,
    clinicId: string,
  ): Promise<void> {
    // Verify email uniqueness
    const existing = await this.prisma.user.findUnique({
      where: { email: row.email },
    });
    if (existing) {
      throw new Error(`Email already exists: ${row.email}`);
    }

    // Create doctor user
    await this.prisma.user.create({
      data: {
        email: row.email,
        name: row.name,
        password: 'temp_password', // Should be sent via separate notification
        role: 'DOCTOR',
        clinicId,
        specialization: row.specialization,
        registrationNumber: row.registrationNumber,
        phoneNumber: row.phoneNumber,
      },
    });
  }

  /**
   * Import lab test row
   */
  private importLabTest(row: Record<string, any>, clinicId: string): void {
    // Implementation depends on lab test schema
    this.logger.debug(`Importing lab test: ${row.testName}`);
  }

  /**
   * Import inventory row
   */
  private importInventory(row: Record<string, any>, clinicId: string): void {
    // Implementation depends on inventory schema
    this.logger.debug(`Importing inventory item: ${row.itemName}`);
  }

  /**
   * Check if entity type is valid
   */
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

  /**
   * Get import template for entity type
   */
  getImportTemplate(entityType: BulkImportEntityType): Record<string, string> {
    const templates: Record<BulkImportEntityType, Record<string, string>> = {
      PATIENT: {
        firstName: 'John',
        lastName: 'Doe',
        phoneNumber: '+919876543210',
        email: 'john@example.com',
        dateOfBirth: '1990-01-15',
        bloodGroup: 'O+',
        gender: 'M',
        address: '123 Main St, City',
      },
      PRESCRIPTION: {
        patientId: 'patient_id_here',
        doctorId: 'doctor_id_here',
        instructions: 'Take with food',
      },
      DOCTOR: {
        name: 'Dr. Jane Smith',
        email: 'jane@hospital.com',
        phone: '+919876543210',
        specialization: 'Cardiology',
        registrationNumber: 'MCI12345',
      },
      LAB_TEST: {
        testName: 'Blood Test',
        testCode: 'BT001',
        description: 'Complete blood count',
        cost: '500',
        turnaroundTime: '24 hours',
      },
      INVENTORY: {
        itemName: 'Aspirin 500mg',
        quantity: '100',
        cost: '50',
        reorderLevel: '20',
        category: 'Medicine',
      },
    };

    return templates[entityType];
  }

  /**
   * Generate CSV template
   */
  generateCSVTemplate(entityType: BulkImportEntityType): string {
    const template = this.getImportTemplate(entityType);
    const headers = Object.keys(template);
    const csvContent =
      headers.join(',') + '\n' + headers.map((h) => template[h]).join(',');
    return csvContent;
  }
}
