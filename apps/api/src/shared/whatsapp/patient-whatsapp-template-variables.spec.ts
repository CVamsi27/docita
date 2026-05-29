import {
  buildAppointmentDelayVariables,
  buildInvoiceCreatedVariables,
  buildPaymentLinkVariables,
  buildPrescriptionCreatedVariables,
} from './patient-whatsapp-template-variables';

describe('patient-whatsapp-template-variables', () => {
  it('builds prescription_created variables with public rx link', () => {
    expect(
      buildPrescriptionCreatedVariables({
        prescriptionId: 'rx-1',
        patientName: 'Priya Sharma',
        doctorName: 'Dr. Patel',
        clinicName: 'Apollo Clinic',
      }),
    ).toEqual({
      clinicName: 'Apollo Clinic',
      patientName: 'Priya Sharma',
      doctorName: 'Dr. Patel',
      rxToken: 'rx-1',
      rxLink: 'https://docita.work/rx/rx-1',
    });
  });

  it('builds invoice_created variables with formatted amount', () => {
    const vars = buildInvoiceCreatedVariables({
      invoiceId: 'inv-1',
      patientName: 'Priya Sharma',
      clinicName: 'Apollo Clinic',
      amount: 850,
      currency: 'INR',
    });
    expect(vars.invToken).toBe('inv-1');
    expect(vars.invLink).toBe('https://docita.work/inv/inv-1');
    expect(vars.amount).toContain('850');
  });

  it('builds appointment_delay variables with new slot labels', () => {
    const updatedStart = new Date('2026-05-28T11:30:00.000Z');
    const vars = buildAppointmentDelayVariables({
      patientName: 'Priya Sharma',
      clinicName: 'Apollo Clinic',
      delayMinutes: 30,
      updatedStartTime: updatedStart,
      clinicTimezone: 'Asia/Kolkata',
    });

    expect(vars.delayMinutes).toBe('30');
    expect(vars.newDate).toBeTruthy();
    expect(vars.newTime).toBeTruthy();
    expect(vars).not.toHaveProperty('date');
    expect(vars).not.toHaveProperty('time');
  });

  it('builds payment_link variables with pay token', () => {
    expect(
      buildPaymentLinkVariables({
        patientName: 'Priya Sharma',
        clinicName: 'Apollo Clinic',
        amount: 500,
        currency: 'INR',
        paymentSessionId: 'ps-1',
      }),
    ).toMatchObject({
      payToken: 'ps-1',
      payLink: 'https://docita.work/pay/ps-1',
    });
  });
});
