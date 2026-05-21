import { appointmentListItemResponseSchema } from '@workspace/types';
import { isRecord } from '@workspace/utils';

const APPOINTMENT_LIST_ITEM_SHAPE = appointmentListItemResponseSchema.omit({
  patient: true,
  doctor: true,
}).shape;

/** Strip detail-only clinical fields before strict list contract parse. */
export function pickAppointmentListPlainFields(
  plain: object,
): Record<string, unknown> {
  const source = isRecord(plain) ? plain : {};
  const item: Record<string, unknown> = {};
  for (const key of Object.keys(APPOINTMENT_LIST_ITEM_SHAPE)) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      item[key] = source[key];
    }
  }
  return item;
}
