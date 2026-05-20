import type { RequestWithUser } from '@/shared/common/types/common.types';
import {
  getClinicStaffRequestContext,
  type ClinicStaffRequestContext,
} from '@/shared/modules/auth/auth/clinic-request-context';

export type BillingRequestContext = Pick<
  ClinicStaffRequestContext,
  'clinicId' | 'userId'
>;

export function getBillingRequestContext(
  req: RequestWithUser,
): BillingRequestContext {
  const { clinicId, userId } = getClinicStaffRequestContext(req);
  return { clinicId, userId };
}
