import type { Prisma } from '@workspace/db';

/**
 * Minimal read surface for the clinic-membership check. Both the API
 * PrismaService and the public-booking persistence port satisfy it, so the
 * rule lives here once instead of being re-implemented per caller.
 */
interface DoctorClinicMembershipClient {
  user: {
    count(args: { where: Prisma.UserWhereInput }): Promise<number>;
  };
  doctorClinic: {
    count(args: { where: Prisma.DoctorClinicWhereInput }): Promise<number>;
  };
}

interface DoctorClinicMembershipArgs {
  doctorId: string;
  clinicId: string;
}

/**
 * Whether a doctor may act for a clinic: a live account whose primary clinic
 * is this one, or an active DoctorClinic link to a live account.
 *
 * A soft-deleted account is not a bookable practitioner, and an inactive link
 * means the doctor no longer works here — neither may authorize holding a
 * public slot, reviewing a booking, or creating an appointment.
 */
export function doctorBelongsToClinic(
  client: DoctorClinicMembershipClient,
  { doctorId, clinicId }: DoctorClinicMembershipArgs,
): Promise<boolean> {
  return Promise.all([
    client.user.count({
      where: {
        id: doctorId,
        clinicId,
        role: { in: ['DOCTOR', 'ADMIN_DOCTOR'] },
        deletedAt: null,
      },
    }),
    client.doctorClinic.count({
      where: {
        doctorId,
        clinicId,
        active: true,
        doctor: { deletedAt: null },
      },
    }),
  ]).then(([directUser, linkedClinic]) => directUser > 0 || linkedClinic > 0);
}
