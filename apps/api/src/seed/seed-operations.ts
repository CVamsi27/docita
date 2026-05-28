import { LeaveStatus, LeaveType, PrismaClient } from '@workspace/db';

interface SeedOperationsParams {
  clinicId: string;
  adminUserId: string;
  doctor1Id: string;
  doctor2Id: string;
  nurseId: string;
  patientPortalUserId: string;
}

function dateOffset(days: number): Date {
  const d = new Date();
  d.setHours(9, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d;
}

export async function seedOperations(
  prisma: PrismaClient,
  params: SeedOperationsParams,
): Promise<void> {
  const {
    clinicId,
    adminUserId,
    doctor1Id,
    doctor2Id,
    nurseId,
    patientPortalUserId,
  } = params;

  // ── Leave plans (annual quotas) ────────────────────────────────────────
  const leavePlans: Array<{ type: LeaveType; quota: number }> = [
    { type: LeaveType.CASUAL, quota: 12 },
    { type: LeaveType.SICK, quota: 10 },
    { type: LeaveType.EARNED, quota: 20 },
    { type: LeaveType.COMP_OFF, quota: 5 },
    { type: LeaveType.UNPAID, quota: 0 },
    { type: LeaveType.HOLIDAY, quota: 12 },
  ];
  for (const plan of leavePlans) {
    await prisma.leavePlan.upsert({
      where: {
        clinicId_leaveType: { clinicId, leaveType: plan.type },
      },
      update: {
        annualQuota: plan.quota,
        carryForward: plan.type === LeaveType.EARNED,
        maxCarryForward: plan.type === LeaveType.EARNED ? 10 : 0,
        isActive: true,
      },
      create: {
        clinicId,
        leaveType: plan.type,
        annualQuota: plan.quota,
        carryForward: plan.type === LeaveType.EARNED,
        maxCarryForward: plan.type === LeaveType.EARNED ? 10 : 0,
        isActive: true,
      },
    });
  }

  // ── Staff leave requests ───────────────────────────────────────────────
  const leaveRequests: Array<{
    id: string;
    staffId: string;
    leaveType: LeaveType;
    startOffset: number;
    endOffset: number;
    status: LeaveStatus;
    reason: string;
  }> = [
    {
      id: 'seed-leave-doctor2-casual',
      staffId: doctor2Id,
      leaveType: LeaveType.CASUAL,
      startOffset: 14,
      endOffset: 15,
      status: LeaveStatus.APPROVED,
      reason: 'Family function',
    },
    {
      id: 'seed-leave-nurse-sick',
      staffId: nurseId,
      leaveType: LeaveType.SICK,
      startOffset: -5,
      endOffset: -3,
      status: LeaveStatus.APPROVED,
      reason: 'Viral fever',
    },
    {
      id: 'seed-leave-doctor1-earned',
      staffId: doctor1Id,
      leaveType: LeaveType.EARNED,
      startOffset: 30,
      endOffset: 37,
      status: LeaveStatus.PENDING,
      reason: 'Annual vacation',
    },
  ];
  for (const lr of leaveRequests) {
    const data = {
      staffId: lr.staffId,
      clinicId,
      leaveType: lr.leaveType,
      startDate: dateOffset(lr.startOffset),
      endDate: dateOffset(lr.endOffset),
      reason: lr.reason,
      status: lr.status,
      approvedBy: lr.status === LeaveStatus.APPROVED ? adminUserId : null,
      approvedAt:
        lr.status === LeaveStatus.APPROVED
          ? dateOffset(lr.startOffset - 2)
          : null,
    };
    await prisma.staffLeave.upsert({
      where: { id: lr.id },
      update: data,
      create: { id: lr.id, ...data },
    });
  }

  // ── Appointment reminders ──────────────────────────────────────────────
  const reminderApptIds = [
    'seed-apt-future-00',
    'seed-apt-future-03',
    'seed-apt-future-07',
    'seed-apt-future-12',
    'seed-apt-future-18',
  ];
  const reminderTypes = ['SMS', 'EMAIL', 'WHATSAPP'];
  for (let i = 0; i < reminderApptIds.length; i++) {
    const apptId = reminderApptIds[i];
    const exists = await prisma.appointment.findUnique({
      where: { id: apptId },
      select: { id: true },
    });
    if (!exists) continue;
    const id = `seed-reminder-${apptId}`;
    const data = {
      appointmentId: apptId,
      clinicId,
      type: reminderTypes[i % reminderTypes.length],
      status: i % 2 === 0 ? 'SENT' : 'PENDING',
      sentAt: i % 2 === 0 ? dateOffset(-1) : null,
    };
    await prisma.appointmentReminder.upsert({
      where: { id },
      update: data,
      create: { id, ...data },
    });
  }

  // ── Patient feedback ───────────────────────────────────────────────────
  const feedbackPlans: Array<{
    id: string;
    userId: string;
    rating: number;
    good: string[];
    bad: string[];
    comments: string;
  }> = [
    {
      id: 'seed-feedback-1',
      userId: patientPortalUserId,
      rating: 5,
      good: ['EASE_OF_USE', 'PRESCRIPTIONS'],
      bad: [],
      comments: 'The patient portal is excellent. Easy to view prescriptions.',
    },
    {
      id: 'seed-feedback-2',
      userId: adminUserId,
      rating: 4,
      good: ['APPOINTMENTS', 'BILLING'],
      bad: ['REPORTS'],
      comments: 'Workflow is smooth, but reports could be richer.',
    },
    {
      id: 'seed-feedback-3',
      userId: doctor1Id,
      rating: 5,
      good: ['CLINICAL_NOTES', 'PRESCRIPTIONS'],
      bad: [],
      comments: 'Clinical templates save a lot of time per encounter.',
    },
    {
      id: 'seed-feedback-4',
      userId: nurseId,
      rating: 4,
      good: ['VITALS'],
      bad: ['MOBILE'],
      comments: 'Mobile UX for vitals entry could be more compact.',
    },
  ];
  for (const fb of feedbackPlans) {
    const data = {
      clinicId,
      userId: fb.userId,
      overallRating: fb.rating,
      goodFeatures: fb.good,
      badFeatures: fb.bad,
      improvementAreas: fb.bad,
      generalComments: fb.comments,
    };
    await prisma.feedback.upsert({
      where: { id: fb.id },
      update: data,
      create: { id: fb.id, ...data },
    });
  }

  // ── Clinic custom fields ───────────────────────────────────────────────
  const customFields: Array<{
    id: string;
    name: string;
    fieldType: string;
    required: boolean;
    order: number;
    options?: string;
  }> = [
    {
      id: 'seed-cf-insurance-provider',
      name: 'Insurance Provider',
      fieldType: 'TEXT',
      required: false,
      order: 1,
    },
    {
      id: 'seed-cf-referral-source',
      name: 'Referral Source',
      fieldType: 'SELECT',
      required: false,
      order: 2,
      options: 'Walk-in,Doctor Referral,Online Booking,Friend/Family',
    },
  ];
  for (const cf of customFields) {
    const data = {
      clinicId,
      name: cf.name,
      fieldType: cf.fieldType,
      required: cf.required,
      order: cf.order,
      options: cf.options ?? null,
    };
    await prisma.customField.upsert({
      where: { id: cf.id },
      update: data,
      create: { id: cf.id, ...data },
    });
  }
}
