import { BadRequestException, Injectable } from '@nestjs/common';
import {
  getErrorMessage,
  PATIENT_FIELD_MAPPINGS,
  type ColumnMapping,
  type ImportPreview,
} from '@workspace/utils';
import { ImportFileParserService } from './import-file-parser.service';
import { ImportColumnMappingService } from './import-column-mapping.service';

export { PATIENT_FIELD_MAPPINGS };

@Injectable()
export class ImportPreviewService {
  constructor(
    private readonly fileParser: ImportFileParserService,
    private readonly columnMapping: ImportColumnMappingService,
  ) {}

  async previewImport(filePath: string): Promise<ImportPreview> {
    try {
      const data = await this.fileParser.parseTabularRows(filePath);
      if (data.length < 2) {
        throw new BadRequestException(
          'File must have at least a header row and one data row',
        );
      }

      const headers = data[0].map((value) =>
        this.columnMapping.toHeaderString(value),
      );
      if (headers.filter((header) => header.length > 0).length === 0) {
        throw new BadRequestException('Header row is empty');
      }

      const allDataRows = data
        .slice(1)
        .filter((row) => !this.fileParser.isRowEmpty(row));
      if (allDataRows.length === 0) {
        throw new BadRequestException(
          'File must have at least one non-empty data row',
        );
      }

      const dataRows = allDataRows.slice(0, 5);

      const columns: ColumnMapping[] = headers.map((header, index) => ({
        excelColumn: header,
        dbField: this.columnMapping.suggestFieldMapping(header),
        sampleValues: dataRows
          .map((row) => String(this.fileParser.getCell(row, index) || ''))
          .filter((v) => v),
      }));

      const suggestedMappings: Record<string, string> = {};
      columns.forEach((col) => {
        if (col.dbField) {
          suggestedMappings[col.excelColumn] = col.dbField;
        }
      });

      const sampleData = dataRows.map((row) => {
        const obj: Record<string, string | number> = {};
        headers.forEach((header, index) => {
          const value = this.fileParser.getCell(row, index);
          obj[header] =
            value instanceof Date ? value.toISOString() : (value ?? '');
        });
        return obj;
      });

      return {
        columns,
        suggestedMappings,
        totalRows: allDataRows.length,
        sampleData,
      };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(
        `Failed to read file: ${getErrorMessage(error)}`,
      );
    }
  }
}
