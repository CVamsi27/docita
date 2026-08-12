import { BadRequestException, NotFoundException } from '@nestjs/common';
import { WhatsappLogStatus } from '@workspace/db';
import { TemplateMessageService } from './template-message.service';
import type { WhatsappPersistencePort } from '@/domains/whatsapp/application/ports/whatsapp-persistence.port';
import type { SendMessageUseCase } from '@/domains/whatsapp/application/use-cases/send-message.use-case';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

describe('TemplateMessageService', () => {
  const patientFindFirst = jest.fn<(...args: unknown[]) => Promise<unknown>>();
  const whatsappLogCreate = jest.fn<(...args: unknown[]) => Promise<unknown>>();
  const sendExecute = jest.fn<(...args: unknown[]) => Promise<unknown>>();

  const persistence = {
    patient: { findFirst: patientFindFirst },
    whatsappLog: { create: whatsappLogCreate },
  } as unknown as WhatsappPersistencePort;
  const sendMessage = {
    execute: sendExecute,
  } as unknown as SendMessageUseCase;

  let service: TemplateMessageService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TemplateMessageService(persistence, sendMessage);
  });

  it('resolves the recipient from the clinic-scoped patient record', async () => {
    patientFindFirst.mockResolvedValue({ phoneNumber: ' 919876543210 ' });
    sendExecute.mockResolvedValue({
      messageId: 'message-1',
      providerMessageId: 'provider-1',
      senderMode: 'SHARED',
      senderPhoneNumberId: null,
    });
    whatsappLogCreate.mockResolvedValue({ id: 'log-1' });

    await expect(
      service.handleSendCustomMessage('clinic-1', 'user-1', {
        patientId: 'patient-1',
        text: 'Please confirm your follow-up appointment.',
      }),
    ).resolves.toEqual({
      success: true,
      messageId: 'provider-1',
    });

    expect(patientFindFirst).toHaveBeenCalledWith({
      where: { id: 'patient-1', clinicId: 'clinic-1' },
      select: { phoneNumber: true },
    });
    expect(sendExecute).toHaveBeenCalledWith({
      clinicId: 'clinic-1',
      recipientPhone: '919876543210',
      text: 'Please confirm your follow-up appointment.',
    });
    expect(whatsappLogCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        clinicId: 'clinic-1',
        patientId: 'patient-1',
        type: 'custom_message',
        phoneNumber: '919876543210',
        message: 'Please confirm your follow-up appointment.',
        status: WhatsappLogStatus.SENT,
        requestBody: {
          patientId: 'patient-1',
          requestedByUserId: 'user-1',
        },
      }),
    });
  });

  it('rejects patients outside the active clinic', async () => {
    patientFindFirst.mockResolvedValue(null);

    await expect(
      service.handleSendCustomMessage('clinic-1', 'user-1', {
        patientId: 'patient-from-another-clinic',
        text: 'Follow-up message',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(sendExecute).not.toHaveBeenCalled();
  });

  it('rejects patients without a phone number', async () => {
    patientFindFirst.mockResolvedValue({ phoneNumber: null });

    await expect(
      service.handleSendCustomMessage('clinic-1', 'user-1', {
        patientId: 'patient-1',
        text: 'Follow-up message',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(sendExecute).not.toHaveBeenCalled();
  });
});
