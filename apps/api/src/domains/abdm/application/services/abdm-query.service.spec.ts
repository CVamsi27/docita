import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { AbdmExchangeService } from './abdm-exchange.service';
import { AbdmQueryService } from './abdm-query.service';

describe('AbdmQueryService', () => {
  const exchange = {
    listCareContexts: jest.fn(),
    getOpsInbox: jest.fn(),
    listExternalRecords: jest.fn(),
  } as unknown as jest.Mocked<
    Pick<
      AbdmExchangeService,
      'listCareContexts' | 'getOpsInbox' | 'listExternalRecords'
    >
  >;

  const service = new AbdmQueryService(
    exchange as unknown as AbdmExchangeService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    exchange.listCareContexts.mockResolvedValue([
      {
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
      },
    ]);
    exchange.getOpsInbox.mockResolvedValue({
      retryableTransactions: [],
      failedTransactions: [],
      pendingConsents: [],
      recentExternalRecords: [],
    });
    exchange.listExternalRecords.mockResolvedValue([
      {
        id: 'rec-1',
        patientId: 'patient-1',
        consentRequestId: null,
        sourceHipId: null,
        careContextReference: 'DOCITA-PRESCRIPTION-rx-1',
        hiType: 'Prescription',
        receivedAt: '2026-06-12T00:00:00.000Z',
      },
    ]);
  });

  it('delegates listCareContexts with the patient filter', async () => {
    const result = await service.listCareContexts('clinic-1', 'patient-1');

    expect(exchange.listCareContexts).toHaveBeenCalledWith(
      'clinic-1',
      'patient-1',
    );
    expect(result).toHaveLength(1);
  });

  it('delegates listCareContexts without a patient filter', async () => {
    const result = await service.listCareContexts('clinic-1');

    expect(exchange.listCareContexts).toHaveBeenCalledWith(
      'clinic-1',
      undefined,
    );
    expect(result).toHaveLength(1);
  });

  it('delegates getOpsInbox to the exchange service', async () => {
    const result = await service.getOpsInbox('clinic-1');

    expect(exchange.getOpsInbox).toHaveBeenCalledWith('clinic-1');
    expect(result).toEqual({
      retryableTransactions: [],
      failedTransactions: [],
      pendingConsents: [],
      recentExternalRecords: [],
    });
  });

  it('delegates listExternalRecords with the patient filter', async () => {
    const result = await service.listExternalRecords('clinic-1', 'patient-1');

    expect(exchange.listExternalRecords).toHaveBeenCalledWith(
      'clinic-1',
      'patient-1',
    );
    expect(result).toHaveLength(1);
  });

  it('delegates listExternalRecords without a patient filter', async () => {
    const result = await service.listExternalRecords('clinic-1');

    expect(exchange.listExternalRecords).toHaveBeenCalledWith(
      'clinic-1',
      undefined,
    );
    expect(result).toHaveLength(1);
  });
});
