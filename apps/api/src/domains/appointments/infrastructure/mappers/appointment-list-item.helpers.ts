import { appointmentListItemResponseSchema } from '@workspace/types';

const APPOINTMENT_LIST_ITEM_ROOT_KEYS = Object.keys(
  appointmentListItemResponseSchema.omit({ patient: true, doctor: true }).shape,
) as Array<keyof typeof appointmentListItemResponseSchema.shape>;

/** Strip detail-only clinical fields before strict list contract parse. */
export function pickAppointmentListPlainFields(
  plain: object,
): Record<string, unknown> {
  const source = plain as Record<string, unknown>;
  const item: Record<string, unknown> = {};
  for (const key of APPOINTMENT_LIST_ITEM_ROOT_KEYS) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      item[key] = source[key];
    }
  }
  return item;
}
