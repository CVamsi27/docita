import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { unlink } from 'fs/promises';
import type { ImportResult } from '@workspace/utils';
import { ImportFileParserService } from './import-file-parser.service';
import { ImportColumnMappingService } from './import-column-mapping.service';
import {
  DUPLICATE_DETECTOR_TOKEN,
  type IDuplicateDetector,
} from './ports/duplicate-detector.port';
import { ImportPatientPersistenceService } from './import-patient-persistence.service';
import type {
  ExcelRow,
  ImportAuditContext,
  MappedPatientData,
} from './import-types';

@Injectable()
export class PatientTabularImportService {
  private readonly logger = new Logger(PatientTabularImportService.name);

  constructor(
    private readonly fileParser: ImportFileParserService,
    private readonly columnMapping: ImportColumnMappingService,
    @Inject(DUPLICATE_DETECTOR_TOKEN)
    private readonly duplicateDetector: IDuplicateDetector,
    private readonly patientPersistence: ImportPatientPersistenceService,
  ) {}

  async processPatientImport(
    filePath: string,
    clinicId: string | undefined,
    columnMapping: Record<string, string> | undefined,
    audit: ImportAuditContext,
  ): Promise<ImportResult> {
    if (!audit.dpdpNoticeVersion) {
      throw new BadRequestException(
        'DPDP consent attestation is required for patient imports',
      );
    }
    try {
      const tableRows = await this.fileParser.parseTabularRows(filePath);
      if (tableRows.length < 2) {
        throw new BadRequestException(
          'File must have at least a header row and one data row',
        );
      }

      const headers = tableRows[0].map((value) =>
        this.columnMapping.toHeaderString(value),
      );
      const dataRows = tableRows
        .slice(1)
        .filter((row) => !this.fileParser.isRowEmpty(row));
      const data = this.columnMapping.mapDataRows(headers, dataRows);

      const results: ImportResult = {
        total: data.length,
        success: 0,
        failed: 0,
        duplicates: 0,
        errors: [],
        duplicateDetails: [],
      };

      for (const [index, row] of data.entries()) {
        try {
          const excelRow = row as ExcelRow;
          const mapped = columnMapping
            ? this.columnMapping.applyColumnMapping(excelRow, columnMapping)
            : (excelRow as MappedPatientData);

          const duplicateCheck = await this.duplicateDetector.checkForDuplicates(
            mapped,
            clinicId,
          );

          if (duplicateCheck.isDuplicate) {
            results.duplicates++;
            results.duplicateDetails.push({
              row: index + 2,
              reason: duplicateCheck.reason,
              existingPatient: duplicateCheck.existingPatient,
            });
            continue;
          }

          await this.patientPersistence.importSinglePatient(
            mapped,
            clinicId,
            audit,
          );
          results.success++;
        } catch (error) {
          results.failed++;
          results.errors.push(`Row ${index + 2}: ${(error as Error).message}`);
        }
      }

      return results;
    } finally {
      try {
        await unlink(filePath);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Unknown temporary file cleanup failure';
        this.logger.warn(`Failed to remove import temporary file: ${message}`);
      }
    }
  }
}
