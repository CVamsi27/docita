import { BadRequestException, Injectable } from '@nestjs/common';
import type { SearchEntityType } from './search.types';
import type { ISearchStrategy } from './strategies/search-strategy.interface';
import { PatientSearchStrategy } from './strategies/patient-search.strategy';
import { AppointmentSearchStrategy } from './strategies/appointment-search.strategy';
import { PrescriptionSearchStrategy } from './strategies/prescription-search.strategy';

const SEARCHABLE_ENTITY_TYPES = [
  'patient',
  'appointment',
  'prescription',
] as const satisfies readonly Exclude<SearchEntityType, 'all'>[];

@Injectable()
export class SearchStrategyRegistry {
  private readonly strategies: Map<
    Exclude<SearchEntityType, 'all'>,
    ISearchStrategy
  >;

  constructor(
    patientStrategy: PatientSearchStrategy,
    appointmentStrategy: AppointmentSearchStrategy,
    prescriptionStrategy: PrescriptionSearchStrategy,
  ) {
    this.strategies = new Map<
      Exclude<SearchEntityType, 'all'>,
      ISearchStrategy
    >([
      ['patient', patientStrategy],
      ['appointment', appointmentStrategy],
      ['prescription', prescriptionStrategy],
    ]);
  }

  resolveTypes(types: SearchEntityType[]): Exclude<SearchEntityType, 'all'>[] {
    if (types.includes('all')) {
      return [...SEARCHABLE_ENTITY_TYPES];
    }

    return types.filter(
      (type): type is Exclude<SearchEntityType, 'all'> => type !== 'all',
    );
  }

  get(entityType: Exclude<SearchEntityType, 'all'>): ISearchStrategy {
    const strategy = this.strategies.get(entityType);
    if (!strategy) {
      throw new BadRequestException(`Unsupported search entity type: ${entityType}`);
    }
    return strategy;
  }
}
