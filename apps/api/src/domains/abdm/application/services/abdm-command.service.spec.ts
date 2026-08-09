import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type {
  CreateAbdmCareContextRequest,
  CreateAbdmConsentRequest,
} from '@workspace/types';
import type { AbdmExchangeService } from './abdm-exchange.service';
import { AbdmCommandService } from './abdm-command.service';

describe('AbdmCommandService', () => {
  const exchange = {
    createCareContext: jest.fn(),
    requestCareContextLink: jest.fn(),
    requestCareContextShare: jest.fn(),
    createConsentRequest: jest.fn(),
  } as unknown as jest.Mocked<
    Pick<
      AbdmExchangeService,
      | 'createCareContext'
      | 'requestCareContextLink'
      | 'requestCareContextShare'
      | 'createConsentRequest'
    >
  >;

  const service = new AbdmCommandService(
    exchange as unknown as AbdmExchangeService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    exchange.createCareContext.mockResolvedValue({
      id: 'ctx-1',
      patientId: 'patient-1',
      sourceType: 'PRESCRIPTION',
      sourceId: 'rx-1',
      referenceNumber: 'DOCITA-PRESCRIPTION-rx-1',
      display: 'Prescription 2026-06-12',
      hiType: 'Prescription',
      status: 'READY',
      linkedAt: null,
      lastSharedAt: null,
      createdAt: '2026-06-12T00:00:00.000Z',
      updatedAt: '2026-06-12T00:00:00.000Z',
    });
    exchange.requestCareContextLink.mockResolvedValue({
      id: 'ctx-1',
      patientId: 'patient-1',
      sourceType: 'PRESCRIPTION',
      sourceId: 'rx-1',
      referenceNumber: 'DOCITA-PRESCRIPTION-rx-1',
      display: 'Prescription 2026-06-12',
      hiType: 'Prescription',
      status: 'LINK_REQUESTED',
      linkedAt: null,
      lastSharedAt: null,
      createdAt: '2026-06-12T00:00:00.000Z',
      updatedAt: '2026-06-12T00:00:00.000Z',
    });
    exchange.requestCareContextShare.mockResolvedValue({
      id: 'ctx-1',
      patientId: 'patient-1',
      sourceType: 'PRESCRIPTION',
      sourceId: 'rx-1',
      referenceNumber: 'DOCITA-PRESCRIPTION-rx-1',
      display: 'Prescription 2026-06-12',
      hiType: 'Prescription',
      status: 'SHARE_REQUESTED',
      linkedAt: null,
      lastSharedAt: null,
      createdAt: '2026-06-12T00:00:00.000Z',
      updatedAt: '2026-06-12T00:00:00.000Z',
    });
    exchange.createConsentRequest.mockResolvedValue({
      id: 'consent-1',
      patientId: 'patient-1',
      abhaAddress: 'asha.verma@abdm',
      purposeCode: 'CAREMGT',
      purposeText: 'Care Management',
      status: 'REQUESTED',
      requestId: 'request-1',
      consentId: null,
      artefactId: null,
      requestedAt: '2026-06-12T00:00:00.000Z',
      grantedAt: null,
      expiresAt: null,
      createdAt: '2026-06-12T00:00:00.000Z',
      updatedAt: '2026-06-12T00:00:00.000Z',
    });
  });

  it('delegates createCareContext to the exchange service', async () => {
    const input: CreateAbdmCareContextRequest = {
      patientId: 'patient-1',
      sourceType: 'PRESCRIPTION',
      sourceId: 'rx-1',
    };

    const result = await service.createCareContext('clinic-1', input);

    expect(exchange.createCareContext).toHaveBeenCalledWith(
      'clinic-1',
      input,
    );
    expect(result.id).toBe('ctx-1');
  });

  it('delegates requestCareContextLink to the exchange service', async () => {
    const result = await service.requestCareContextLink('clinic-1', 'ctx-1');

    expect(exchange.requestCareContextLink).toHaveBeenCalledWith(
      'clinic-1',
      'ctx-1',
    );
    expect(result.status).toBe('LINK_REQUESTED');
  });

  it('delegates requestCareContextShare to the exchange service', async () => {
    const result = await service.requestCareContextShare('clinic-1', 'ctx-1');

    expect(exchange.requestCareContextShare).toHaveBeenCalledWith(
      'clinic-1',
      'ctx-1',
    );
    expect(result.status).toBe('SHARE_REQUESTED');
  });

  it('delegates createConsentRequest to the exchange service', async () => {
    const input: CreateAbdmConsentRequest = {
      patientId: 'patient-1',
      abhaAddress: 'asha.verma@abdm',
      purposeCode: 'CAREMGT',
      purposeText: 'Care Management',
    };

    const result = await service.createConsentRequest('clinic-1', input);

    expect(exchange.createConsentRequest).toHaveBeenCalledWith(
      'clinic-1',
      input,
    );
    expect(result.status).toBe('REQUESTED');
  });
});
