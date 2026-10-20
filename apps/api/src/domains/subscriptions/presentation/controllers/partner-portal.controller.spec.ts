import { describe, expect, it, jest } from '@jest/globals';
import { ZodValidationException } from 'nestjs-zod';
import { ZodError } from 'zod';
import type { Request } from 'express';
import { PartnerPortalController } from './partner-portal.controller';
import { PartnerPortalService } from '../../core/services/partner-portal.service';
import { FacilityLeadSubmissionCommandService } from '../../core/services/facility-lead-submission-command.service';
import { PARTNER_AUTH_REQUEST_KEY } from '../guards/partner-auth.guard';

function createController() {
  const getMe = jest.fn<(...args: unknown[]) => Promise<unknown>>();
  const listPayouts = jest.fn<(...args: unknown[]) => Promise<unknown>>();
  const listReferrals = jest.fn<(...args: unknown[]) => Promise<unknown>>();
  const listMyLeads = jest.fn<(...args: unknown[]) => Promise<unknown>>();
  const upsertPayoutDetails =
    jest.fn<(...args: unknown[]) => Promise<unknown>>();
  const getShareMessage = jest.fn<(...args: unknown[]) => Promise<unknown>>();
  const renderShowcasePdf = jest.fn<(...args: unknown[]) => Promise<unknown>>();
  const submitLead = jest.fn<(...args: unknown[]) => Promise<unknown>>();

  const portal = {
    getMe,
    listPayouts,
    listReferrals,
    listMyLeads,
    upsertPayoutDetails,
    getShareMessage,
    renderShowcasePdf,
  } as unknown as PartnerPortalService;
  const leadService = {
    submitLead,
  } as unknown as FacilityLeadSubmissionCommandService;
  const controller = new PartnerPortalController(portal, leadService);
  return { controller, portal, upsertPayoutDetails };
}

function requestWithContext(): Request {
  return {
    [PARTNER_AUTH_REQUEST_KEY]: { referrerId: 'referrer-1' },
  } as unknown as Request;
}

describe('PartnerPortalController', () => {
  describe('putPayoutDetails', () => {
    it('throws a ZodValidationException (400 + field map via the global filter) for an invalid body, not a raw ZodError', async () => {
      const { controller, portal } = createController();

      let thrown: unknown;
      try {
        await controller.putPayoutDetails(
          requestWithContext(),
          // Invalid account number: schema requires /^\d{9,18}$/.
          {
            accountHolder: 'Dr. Rao',
            accountNumber: '123',
            ifsc: 'INVALID',
          },
        );
      } catch (error) {
        thrown = error;
      }

      expect(thrown).toBeInstanceOf(ZodValidationException);
      expect(thrown).not.toBeInstanceOf(ZodError);
      // The service must not be reached on invalid input.
      expect(portal.upsertPayoutDetails).not.toHaveBeenCalled();
    });

    it('delegates a valid body to the service with the authenticated referrer id', async () => {
      const { controller, portal, upsertPayoutDetails } = createController();
      upsertPayoutDetails.mockResolvedValue({ id: 'payout-1' });
      const validBody = {
        accountHolder: 'Dr. Rao',
        accountNumber: '123456789',
        ifsc: 'HDFC0001234',
        bankName: 'HDFC Bank',
      };

      const result = await controller.putPayoutDetails(
        requestWithContext(),
        validBody,
      );

      expect(portal.upsertPayoutDetails).toHaveBeenCalledWith(
        'referrer-1',
        validBody,
      );
      expect(result).toEqual({ id: 'payout-1' });
    });
  });
});
