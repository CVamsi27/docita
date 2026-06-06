import { Inject, Injectable, Logger } from '@nestjs/common';
import type {
  FullTextCapableEntity,
  FullTextSupportState,
} from './search.types';
import {
  SEARCH_SCHEMA_REPOSITORY_TOKEN,
  type SearchSchemaRepository,
} from '@/shared/modules/search/ports/search-schema.repository.port';

@Injectable()
export class SearchFullTextSupportService {
  private readonly logger = new Logger(SearchFullTextSupportService.name);
  private fullTextSupportPromise: Promise<FullTextSupportState> | null = null;
  private fullTextSupport: FullTextSupportState = {
    patient: true,
    appointment: true,
  };

  constructor(
    @Inject(SEARCH_SCHEMA_REPOSITORY_TOKEN)
    private readonly searchSchema: SearchSchemaRepository,
  ) {}

  async getSupport(): Promise<FullTextSupportState> {
    if (!this.fullTextSupportPromise) {
      this.fullTextSupportPromise = this.detectSupport().then((support) => {
        this.fullTextSupport = support;
        return support;
      });
    }

    return this.fullTextSupportPromise;
  }

  /** Resets cached probe state (unit tests only). */
  resetSupportStateForTests(): void {
    this.fullTextSupportPromise = null;
    this.fullTextSupport = {
      patient: true,
      appointment: true,
    };
  }

  disable(entity: FullTextCapableEntity): void {
    if (!this.fullTextSupport[entity]) {
      return;
    }

    this.fullTextSupport = {
      ...this.fullTextSupport,
      [entity]: false,
    };
    this.fullTextSupportPromise = Promise.resolve(this.fullTextSupport);
  }

  private async detectSupport(): Promise<FullTextSupportState> {
    try {
      const rows = await this.searchSchema.getPatientAndAppointmentTsvectorSupport();

      const supportByTable = new Map(
        rows.map((row) => [row.tableName, row.hasSearchTsvector]),
      );

      return {
        patient: supportByTable.get('Patient') ?? false,
        appointment: supportByTable.get('Appointment') ?? false,
      };
    } catch (error) {
      this.logger.warn(
        `Unable to probe full-text search support; defaulting to full-text path: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return { patient: true, appointment: true };
    }
  }
}
