import { expectMatchesSchema } from '../../contract-assertions';
import {
  listAppointmentsResponseSchema,
  appointmentListItemResponseSchema,
  startConsultationResponseSchema,
  uploadSessionContractResponseSchema,
  uploadSessionCreateContractResponseSchema,
  paymentWebhookPayloadSchema,
} from '@workspace/types';

/**
 * P4.3 — Zod contract-parser coverage.
 *
 * Representative API response payloads must parse with the shared
 * `@workspace/types` schemas, strict response schemas must reject undocumented
 * fields, and every schema must reject missing required fields. This is the
 * "fail on undocumented fields or missing required fields" half of the P4.3
 * contract-test work; the other half lives inside the domain e2e specs, where
 * real HTTP responses are parsed with `expectMatchesSchema`.
 */
describe('Zod response contracts', () => {
  describe('listAppointmentsResponseSchema', () => {
    const validAppointmentItem = {
      id: 'appt_1',
      clinicId: 'clinic_1',
      patientId: 'patient_1',
      doctorId: 'doctor_1',
      startTime: '2026-09-15T04:30:00.000Z',
      endTime: '2026-09-15T05:00:00.000Z',
      status: 'scheduled',
      type: 'consultation',
      priority: 'ROUTINE',
      createdAt: '2026-08-01T10:00:00.000Z',
      updatedAt: '2026-08-01T10:00:00.000Z',
      version: 1,
    };

    it('parses a representative list response', () => {
      const parsed = expectMatchesSchema(listAppointmentsResponseSchema, {
        items: [validAppointmentItem],
        hasMore: false,
        count: 1,
      });
      expect(parsed.items[0].status).toBe('scheduled');
    });

    it('rejects an undocumented field on the strict list envelope', () => {
      const result = listAppointmentsResponseSchema.safeParse({
        items: [validAppointmentItem],
        hasMore: false,
        surpriseField: true,
      });
      expect(result.success).toBe(false);
    });

    it('rejects an undocumented field on a strict list item', () => {
      const result = appointmentListItemResponseSchema.safeParse({
        ...validAppointmentItem,
        surpriseField: 'untyped-extra',
      });
      expect(result.success).toBe(false);
    });

    it('rejects a missing required envelope field (items)', () => {
      const result = listAppointmentsResponseSchema.safeParse({
        hasMore: false,
      });
      expect(result.success).toBe(false);
    });

    it('rejects a missing required item field (version)', () => {
      const { version: _version, ...withoutVersion } = validAppointmentItem;
      const result = listAppointmentsResponseSchema.safeParse({
        items: [withoutVersion],
        hasMore: false,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('startConsultationResponseSchema', () => {
    it('parses a representative response', () => {
      const parsed = expectMatchesSchema(startConsultationResponseSchema, {
        appointmentId: 'appt_1',
        status: 'in-progress',
      });
      expect(parsed.appointmentId).toBe('appt_1');
    });

    it('rejects a missing required field', () => {
      const result = startConsultationResponseSchema.safeParse({
        appointmentId: 'appt_1',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('upload session contracts', () => {
    const createdAt = '2026-08-01T10:00:00.000Z';
    const expiresAt = '2026-08-01T10:15:00.000Z';

    it('parses a create-session response', () => {
      const parsed = expectMatchesSchema(
        uploadSessionCreateContractResponseSchema,
        {
          id: 'session_1',
          status: 'pending',
          uploadSecret: 'secret-value',
          createdAt,
          expiresAt,
        },
      );
      expect(parsed.uploadSecret).toBe('secret-value');
    });

    it('rejects a create-session response missing the uploadSecret', () => {
      const result = uploadSessionCreateContractResponseSchema.safeParse({
        id: 'session_1',
        status: 'pending',
        createdAt,
        expiresAt,
      });
      expect(result.success).toBe(false);
    });

    it('parses a post-upload session response', () => {
      const parsed = expectMatchesSchema(uploadSessionContractResponseSchema, {
        id: 'session_1',
        status: 'uploaded',
        fileUrl: '/uploads/documents/abc123.png',
        createdAt,
        expiresAt,
      });
      expect(parsed.fileUrl).toMatch(/^\/uploads\/documents\//);
    });

    it('rejects a session response missing createdAt', () => {
      const result = uploadSessionContractResponseSchema.safeParse({
        id: 'session_1',
        status: 'uploaded',
        fileUrl: '/uploads/documents/abc123.png',
        expiresAt,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('paymentWebhookPayloadSchema', () => {
    it('parses a representative Razorpay payment payload', () => {
      const parsed = expectMatchesSchema(paymentWebhookPayloadSchema, {
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_1',
              amount: 10000,
              currency: 'INR',
              status: 'captured',
              order_id: 'order_1',
              notes: { clinic_id: 'clinic_1', tier: 'ESSENTIAL' },
            },
          },
        },
      });
      expect(parsed.event).toBe('payment.captured');
    });

    it('rejects a webhook payload missing the payload object', () => {
      const result = paymentWebhookPayloadSchema.safeParse({
        event: 'payment.captured',
      });
      expect(result.success).toBe(false);
    });

    it('rejects a payment entity missing amount', () => {
      const result = paymentWebhookPayloadSchema.safeParse({
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_1',
              currency: 'INR',
              status: 'captured',
              order_id: 'order_1',
            },
          },
        },
      });
      expect(result.success).toBe(false);
    });
  });
});
