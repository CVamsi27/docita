import { BadRequestException, Injectable } from '@nestjs/common';
import {
  searchResultTypeSchema,
  type SearchEntityType,
  type SearchResultType,
} from '@workspace/types';
import type { ISearchStrategy } from './strategies/search-strategy.interface';
import { PatientSearchStrategy } from './strategies/patient-search.strategy';
import { AppointmentSearchStrategy } from './strategies/appointment-search.strategy';
import { PrescriptionSearchStrategy } from './strategies/prescription-search.strategy';

/**
 * The searchable types, read off the wire contract instead of restated here, so
 * adding a strategy cannot leave this list quietly behind.
 */
const SEARCHABLE_ENTITY_TYPES = searchResultTypeSchema.options;

@Injectable()
export class SearchStrategyRegistry {
  private readonly strategies: Map<SearchResultType, ISearchStrategy>;

  constructor(
    patientStrategy: PatientSearchStrategy,
    appointmentStrategy: AppointmentSearchStrategy,
    prescriptionStrategy: PrescriptionSearchStrategy,
  ) {
    // `Record<SearchResultType, ...>` is the exhaustiveness check: adding a
    // type to the wire contract without shipping a strategy for it is a
    // compile error here.
    const byType: Record<SearchResultType, ISearchStrategy> = {
      patient: patientStrategy,
      appointment: appointmentStrategy,
      prescription: prescriptionStrategy,
    };
    const entries: [SearchResultType, ISearchStrategy][] =
      SEARCHABLE_ENTITY_TYPES.map((type) => [type, byType[type]]);
    this.strategies = new Map(entries);
  }

  resolveTypes(types: SearchEntityType[]): SearchResultType[] {
    if (types.includes('all')) {
      return [...SEARCHABLE_ENTITY_TYPES];
    }

    return types.filter((type): type is SearchResultType => type !== 'all');
  }

  get(entityType: SearchResultType): ISearchStrategy {
    const strategy = this.strategies.get(entityType);
    if (!strategy) {
      throw new BadRequestException(
        `Unsupported search entity type: ${entityType}`,
      );
    }
    return strategy;
  }
}
