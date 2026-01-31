import { Test, TestingModule } from '@nestjs/testing';
import { FhirImmunizationFactory } from './fhir-immunization.factory';
import { Immunization } from '@workspace/db';

describe('FhirImmunizationFactory', () => {
  let factory: FhirImmunizationFactory;

  // Mock Date for consistent snapshot/testing
  const mockDate = new Date('2023-01-01T00:00:00.000Z');

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FhirImmunizationFactory],
    }).compile();

    factory = module.get<FhirImmunizationFactory>(FhirImmunizationFactory);
  });

  it('should be defined', () => {
    expect(factory).toBeDefined();
  });

  describe('createMany', () => {
    it('should correctly map immunization fields', () => {
      const input: Immunization[] = [
        {
          id: 'imm1',
          patientId: 'p1',
          vaccineName: 'COVID-19',
          cvxCode: '207',
          ndcCode: '80777-0273-10',
          mvxCode: 'MOD',
          manufacturer: 'Moderna',
          lotNumber: '12345',
          expirationDate: new Date('2024-01-01T00:00:00.000Z'),
          administeredDate: mockDate,
          administeredBy: 'Dr. Jones',
          administeredAt: 'Clinic A',
          site: 'LEFT_DELTOID',
          route: 'IM',
          doseNumber: 1,
          seriesComplete: false,
          informationSource: 'Administered',
          notes: 'No reaction',
          createdAt: mockDate,
          updatedAt: mockDate,
          documentUrl: null,
          hadReaction: false,
          reactionDetails: null,
        },
      ];

      const result = factory.createMany(input);

      expect(result).toHaveLength(1);
      const fhirImm = result[0];

      expect(fhirImm.resourceType).toBe('Immunization');
      expect(fhirImm.id).toBe('imm1');
      expect(fhirImm.status).toBe('completed');
      expect(fhirImm.vaccineCode.text).toBe('COVID-19');

      // Check codes
      const cvx = fhirImm.vaccineCode.coding.find(
        (c) => c.system === 'http://hl7.org/fhir/sid/cvx',
      );
      expect(cvx).toBeDefined();
      expect(cvx?.code).toBe('207');

      const ndc = fhirImm.vaccineCode.coding.find(
        (c) => c.system === 'http://hl7.org/fhir/sid/ndc',
      );
      expect(ndc).toBeDefined();
      expect(ndc?.code).toBe('80777-0273-10');

      expect(fhirImm.patient.reference).toBe('Patient/p1');
      expect(fhirImm.occurrenceDateTime).toBe(mockDate.toISOString());
      expect(fhirImm.lotNumber).toBe('12345');
      expect(fhirImm.expirationDate).toBe('2024-01-01');

      // Check site mapping
      // LEFT_DELTOID -> 419161000
      expect(fhirImm.site?.coding[0].code).toBe('419161000');

      // Check route mapping
      // IM -> 78421000
      expect(fhirImm.route?.coding[0].code).toBe('78421000');
    });
  });
});
