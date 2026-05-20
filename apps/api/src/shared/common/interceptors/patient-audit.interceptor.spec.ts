import {
  classifySensitiveWrite,
  sanitizeAuditPayload,
} from '@/shared/common/interceptors/patient-audit.interceptor';

describe('PatientDataAuditInterceptor helpers', () => {
  describe('classifySensitiveWrite', () => {
    it('should ignore non-write methods', () => {
      const classification = classifySensitiveWrite({
        method: 'GET',
        url: '/patients/123',
      });
      expect(classification).toBeNull();
    });

    it('should classify billing writes', () => {
      const classification = classifySensitiveWrite({
        method: 'POST',
        url: '/subscription/billing/checkout',
        body: { clinicId: 'clinic-1' },
      });

      expect(classification).toEqual({
        actionType: 'BILLING_POST',
        resourceType: 'BILLING',
        resourceId: 'clinic-1',
        immediate: false,
      });
    });

    it('should classify API key lifecycle as immediate audit', () => {
      const classification = classifySensitiveWrite({
        method: 'DELETE',
        url: '/auth/api-keys/key-123',
        params: { id: 'key-123' },
      });

      expect(classification).toEqual({
        actionType: 'API_KEY_DELETE',
        resourceType: 'API_KEY',
        resourceId: 'key-123',
        immediate: true,
      });
    });

    it('should classify clinical writes', () => {
      const classification = classifySensitiveWrite({
        method: 'PATCH',
        url: '/patients/pat-123',
        params: { patientId: 'pat-123' },
      });

      expect(classification).toEqual({
        actionType: 'CLINICAL_PATCH',
        resourceType: 'CLINICAL_DATA',
        resourceId: 'pat-123',
        immediate: false,
      });
    });

    it('should classify patient-portal writes as clinical', () => {
      const classification = classifySensitiveWrite({
        method: 'PATCH',
        url: '/patient-portal/profile',
        body: { patientId: 'pat-123' },
      });

      expect(classification).toEqual({
        actionType: 'CLINICAL_PATCH',
        resourceType: 'CLINICAL_DATA',
        resourceId: 'pat-123',
        immediate: false,
      });
    });
  });

  describe('sanitizeAuditPayload', () => {
    it('should redact nested sensitive fields', () => {
      const payload = {
        email: 'admin@clinic.com',
        password: 'plain-text',
        nested: {
          token: 'abc',
          details: {
            currentPassword: 'x',
            code: '111111',
          },
        },
      };

      const sanitized = sanitizeAuditPayload(payload) as Record<
        string,
        unknown
      >;

      expect(sanitized.password).toBe('[REDACTED]');
      expect((sanitized.nested as Record<string, unknown>).token).toBe(
        '[REDACTED]',
      );
      expect(
        (
          (sanitized.nested as Record<string, unknown>).details as Record<
            string,
            unknown
          >
        ).currentPassword,
      ).toBe('[REDACTED]');
    });
  });
});
