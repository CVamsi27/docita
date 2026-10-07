import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  SEARCH_RESULT_TYPES,
  searchEntityTypeSchema,
  searchResponseSchema,
  searchResultSchema,
} from '@workspace/types';
import type { TaggedCacheService } from '@/shared/modules/services/tagged-cache.service';
import { SearchService } from './search.service';
import { SearchStrategyRegistry } from './search-strategy.registry';
import { SearchFullTextSupportService } from './search-full-text-support.service';
import {
  SEARCH_QUERY_REPOSITORY_TOKEN,
  type AppointmentFullTextSearchHit,
  type PatientFullTextSearchHit,
  type SearchQueryRepository,
} from './ports/search-query.repository.port';
import { SEARCH_STRATEGY_PERSISTENCE_PORT } from './ports/search-strategy.persistence.port';
import type { SearchStrategyPersistencePort } from './ports/search-strategy.persistence.port';
import {
  AppointmentSearchStrategy,
  PatientSearchStrategy,
  PrescriptionSearchStrategy,
} from './strategies';
import type { SearchResult } from './search.types';

const CLINIC_ID = 'clinic-1';

function makePatient(
  overrides: Partial<PatientFullTextSearchHit> = {},
): PatientFullTextSearchHit {
  return {
    id: 'patient-1',
    firstName: 'Asha',
    lastName: 'Rao',
    phoneNumber: '+919000000001',
    mrn: 'MRN-1',
    rank: 0.9,
    ...overrides,
  };
}

function makeAppointment(
  overrides: Partial<AppointmentFullTextSearchHit> = {},
): AppointmentFullTextSearchHit {
  return {
    id: 'appt-1',
    notes: null,
    chiefComplaint: 'Fever',
    startTime: new Date('2026-07-04T09:30:00.000Z'),
    patientFirstName: 'Asha',
    patientLastName: 'Rao',
    rank: 0.8,
    ...overrides,
  };
}

type PrescriptionRow = {
  id: string;
  instructions: string | null;
  createdAt: Date;
  patient: { firstName: string; lastName: string };
};

const patientFts = jest.fn<SearchQueryRepository['searchPatientsFullText']>();
const appointmentFts =
  jest.fn<SearchQueryRepository['searchAppointmentsFullText']>();
const patientFuzzy = jest.fn<SearchQueryRepository['searchPatientsFuzzy']>();
const appointmentFuzzy =
  jest.fn<SearchQueryRepository['searchAppointmentsFuzzy']>();
const prescriptionFindMany = jest.fn<() => Promise<PrescriptionRow[]>>();

const searchQueries = {
  searchPatientsFullText: patientFts,
  searchAppointmentsFullText: appointmentFts,
  searchPatientsFuzzy: patientFuzzy,
  searchAppointmentsFuzzy: appointmentFuzzy,
} as unknown as SearchQueryRepository;

const persistence = {
  prescription: { findMany: prescriptionFindMany },
} as unknown as SearchStrategyPersistencePort;

const fullTextSupport = {
  getSupport: async () => ({ patient: true, appointment: true }),
  disable: () => undefined,
} as unknown as SearchFullTextSupportService;

const cacheGet = jest.fn<() => Promise<unknown>>(async () => null);
const cacheSet = jest.fn<(...args: unknown[]) => Promise<unknown>>(
  async () => undefined,
);

function makeService(): SearchService {
  const registry = new SearchStrategyRegistry(
    new PatientSearchStrategy(persistence, fullTextSupport, searchQueries),
    new AppointmentSearchStrategy(persistence, fullTextSupport, searchQueries),
    new PrescriptionSearchStrategy(persistence),
  );
  return new SearchService(
    { get: cacheGet, set: cacheSet } as unknown as TaggedCacheService,
    registry,
  );
}

function makeRegistry(): SearchStrategyRegistry {
  return new SearchStrategyRegistry(
    new PatientSearchStrategy(persistence, fullTextSupport, searchQueries),
    new AppointmentSearchStrategy(persistence, fullTextSupport, searchQueries),
    new PrescriptionSearchStrategy(persistence),
  );
}

/** The SPA receives JSON, not the in-process objects the strategies return. */
function overTheWire(raw: SearchResult[]): unknown {
  return JSON.parse(JSON.stringify(raw)) as unknown;
}

beforeEach(() => {
  jest.clearAllMocks();
  cacheGet.mockResolvedValue(null);
  cacheSet.mockResolvedValue(undefined);
  patientFts.mockResolvedValue([]);
  appointmentFts.mockResolvedValue([]);
  patientFuzzy.mockResolvedValue([]);
  appointmentFuzzy.mockResolvedValue([]);
  prescriptionFindMany.mockResolvedValue([]);
});

/**
 * Contract parity between `SearchController` and the SPA.
 *
 * `searchResponseSchema` in `packages/types/src/contracts/search.ts` is what the
 * SPA now parses `GET /search` with. It replaced a hand-written `SearchResult`
 * in `apps/app/src/features/search/api/search.api.ts` that had already dropped
 * `relevanceScore` and restated the entity-type union by hand — a union the SPA
 * depends on being complete, because `searchResultRoutes`, `typeIcons` and
 * `typeColors` are total maps over it with no fallback branch.
 *
 * These tests run the real strategies and the real `SearchService`, and assert
 * on the *parsed* output, so the next projection the SPA cannot absorb fails
 * here instead of at a clinician's click.
 */
describe('search endpoint contract parity', () => {
  describe('GET /search output', () => {
    it('parses the rows the real strategies produce for an "all" search', async () => {
      patientFts.mockResolvedValue([makePatient()]);
      appointmentFts.mockResolvedValue([makeAppointment()]);
      prescriptionFindMany.mockResolvedValue([
        {
          id: 'rx-1',
          instructions: 'Take twice daily',
          createdAt: new Date('2026-07-04T08:00:00.000Z'),
          patient: { firstName: 'Asha', lastName: 'Rao' },
        },
      ]);

      const raw = await makeService().search({
        clinicId: CLINIC_ID,
        query: 'rao',
        types: ['all'],
        limit: 20,
      });

      expect(() => searchResponseSchema.parse(overTheWire(raw))).not.toThrow();
      const parsed = searchResponseSchema.parse(overTheWire(raw));

      expect(parsed).toHaveLength(3);
      expect(parsed.map((row) => row.type)).toEqual([
        'patient',
        'appointment',
        'prescription',
      ]);
      expect(parsed[0]).toMatchObject({
        id: 'patient-1',
        title: 'Asha Rao',
        subtitle: '+919000000001',
        relevanceScore: 0.9,
      });
      expect(parsed[1]).toMatchObject({
        id: 'appt-1',
        title: 'Asha Rao',
        subtitle: 'Fever',
        relevanceScore: 0.8,
      });
      expect(parsed[2]).toMatchObject({
        id: 'rx-1',
        title: 'Asha Rao',
        subtitle: 'Take twice daily',
      });
    });

    it('parses rows from the ILIKE fallback path too', async () => {
      // Full-text support off: every capable strategy falls back to fuzzy.
      const registry = new SearchStrategyRegistry(
        new PatientSearchStrategy(
          persistence,
          {
            getSupport: async () => ({ patient: false, appointment: false }),
            disable: () => undefined,
          } as unknown as SearchFullTextSupportService,
          searchQueries,
        ),
        new AppointmentSearchStrategy(
          persistence,
          {
            getSupport: async () => ({ patient: false, appointment: false }),
            disable: () => undefined,
          } as unknown as SearchFullTextSupportService,
          searchQueries,
        ),
        new PrescriptionSearchStrategy(persistence),
      );
      const service = new SearchService(
        { get: cacheGet, set: cacheSet } as unknown as TaggedCacheService,
        registry,
      );
      patientFuzzy.mockResolvedValue([
        makePatient({ phoneNumber: null, mrn: null }),
      ]);
      appointmentFuzzy.mockResolvedValue([
        makeAppointment({ chiefComplaint: null, notes: null }),
      ]);

      const raw = await service.search({
        clinicId: CLINIC_ID,
        query: 'rao',
        types: ['patient', 'appointment'],
        limit: 20,
      });

      const parsed = searchResponseSchema.parse(overTheWire(raw));
      const patient = parsed.find((row) => row.type === 'patient');
      const appointment = parsed.find((row) => row.type === 'appointment');

      // A patient row with no phone number and no MRN must still parse: both
      // strategies normalize `''` to `undefined` before returning.
      expect(patient?.subtitle).toBeUndefined();
      expect(patient?.meta?.mrn).toBeUndefined();
      // An appointment with no complaint and no notes falls back to a literal
      // subtitle rather than dropping the field.
      expect(appointment?.subtitle).toBe('Appointment');
    });

    it('parses the in-process rows directly, so the Date-typed meta survives', async () => {
      appointmentFts.mockResolvedValue([makeAppointment()]);

      const raw = await makeService().search({
        clinicId: CLINIC_ID,
        query: 'rao',
        types: ['appointment'],
        limit: 20,
      });

      // Strategies build `meta` with real `Date`s; JSON turns them into strings.
      // Both must satisfy the same schema.
      expect(() => searchResponseSchema.parse(raw)).not.toThrow();
      const parsed = searchResponseSchema.parse(raw);
      expect(parsed[0].meta?.startTime).toBeInstanceOf(Date);

      const wireParsed = searchResponseSchema.parse(overTheWire(raw));
      expect(typeof wireParsed[0].meta?.startTime).toBe('string');
    });

    it('leaves prescriptions without a relevanceScore', async () => {
      prescriptionFindMany.mockResolvedValue([
        {
          id: 'rx-1',
          instructions: null,
          createdAt: new Date('2026-07-04T08:00:00.000Z'),
          patient: { firstName: 'Asha', lastName: 'Rao' },
        },
      ]);

      const raw = await makeService().search({
        clinicId: CLINIC_ID,
        query: 'rao',
        types: ['prescription'],
        limit: 20,
      });

      const parsed = searchResponseSchema.parse(overTheWire(raw));
      expect(parsed[0].relevanceScore).toBeUndefined();
      expect(parsed[0].subtitle).toBe('Prescription');
    });

    it('parses the ranked ordering the service produces', async () => {
      patientFts.mockResolvedValue([
        makePatient({ id: 'patient-low', firstName: 'Ravi', rank: 0.1 }),
        makePatient({ id: 'patient-high', firstName: 'Radha', rank: 0.95 }),
      ]);

      const raw = await makeService().search({
        clinicId: CLINIC_ID,
        query: 'ra',
        types: ['patient'],
        limit: 20,
      });

      const parsed = searchResponseSchema.parse(overTheWire(raw));
      expect(parsed.map((row) => row.id)).toEqual([
        'patient-high',
        'patient-low',
      ]);
    });
  });

  describe('result type union', () => {
    it('refuses "all" as a result type', () => {
      expect(
        searchResultSchema.safeParse({
          id: 'x',
          type: 'all',
          title: 'Anything',
        }).success,
      ).toBe(false);
    });

    it('refuses a result type with no strategy behind it', () => {
      // The failure the closed union buys: without it the SPA would reach
      // `searchResultRoutes['lab']` and throw on click.
      expect(
        searchResultSchema.safeParse({
          id: 'lab-1',
          type: 'lab',
          title: 'CBC',
        }).success,
      ).toBe(false);
    });

    it('still accepts "all" as a request filter', () => {
      expect(searchEntityTypeSchema.safeParse('all').success).toBe(true);
      expect(
        searchEntityTypeSchema.options.length - SEARCH_RESULT_TYPES.length,
      ).toBe(1);
    });

    it('resolves an "all" request to exactly the searchable types', () => {
      expect(makeRegistry().resolveTypes(['all'])).toEqual([
        ...SEARCH_RESULT_TYPES,
      ]);
    });

    it('confines every emitted row type to the resolved request types', async () => {
      patientFts.mockResolvedValue([makePatient()]);
      appointmentFts.mockResolvedValue([makeAppointment()]);
      prescriptionFindMany.mockResolvedValue([]);
      const registry = makeRegistry();

      const raw = await makeService().search({
        clinicId: CLINIC_ID,
        query: 'rao',
        types: ['all'],
        limit: 20,
      });
      const resolved = registry.resolveTypes(['all']);

      expect(
        searchResponseSchema
          .parse(overTheWire(raw))
          .filter((row) => !resolved.includes(row.type)),
      ).toEqual([]);
    });
  });

  describe('field contract', () => {
    it('requires a title, which every strategy always sets', () => {
      expect(
        searchResultSchema.safeParse({ id: 'patient-1', type: 'patient' })
          .success,
      ).toBe(false);
    });

    it('requires an id, which the SPA routes on', () => {
      expect(
        searchResultSchema.safeParse({ type: 'patient', title: 'Asha Rao' })
          .success,
      ).toBe(false);
    });

    it('rejects a null subtitle: strategies use undefined, not null', () => {
      expect(
        searchResultSchema.safeParse({
          id: 'patient-1',
          type: 'patient',
          title: 'Asha Rao',
          subtitle: null,
        }).success,
      ).toBe(false);
    });

    it('rejects a non-numeric relevanceScore', () => {
      expect(
        searchResultSchema.safeParse({
          id: 'patient-1',
          type: 'patient',
          title: 'Asha Rao',
          relevanceScore: '0.9',
        }).success,
      ).toBe(false);
    });

    it('strips unknown fields rather than rejecting the row', () => {
      const parsed = searchResultSchema.parse({
        id: 'patient-1',
        type: 'patient',
        title: 'Asha Rao',
        somethingNew: 'ignored',
      });
      expect(parsed).toEqual({
        id: 'patient-1',
        type: 'patient',
        title: 'Asha Rao',
      });
    });
  });

  describe('cached results', () => {
    it('are not validated by the service, so the SPA parse is the only guard', async () => {
      // Documented, not fixed: the cache returns a stored blob verbatim, so a
      // strategy that starts emitting a new type would be replayed from cache
      // without passing through any schema here.
      cacheGet.mockResolvedValue([{ id: 'lab-1', type: 'lab', title: 'CBC' }]);

      const raw = await makeService().search({
        clinicId: CLINIC_ID,
        query: 'rao',
        types: ['all'],
        limit: 20,
      });

      expect(raw).toHaveLength(1);
      expect(searchResponseSchema.safeParse(overTheWire(raw)).success).toBe(
        false,
      );
    });
  });
});
