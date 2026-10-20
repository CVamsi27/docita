import type {
  AppointmentListItemContractResponse,
  QueueToken,
} from "@workspace/types";

export type AppointmentListItem = AppointmentListItemContractResponse;

/**
 * `GET /queue` row. Derived from `queueTokenSchema` rather than hand-written:
 * the previous local interface drifted from the API (it typed `appointmentId`
 * and `notes` as optional when the server sends `null`, omitted `pending` from
 * `tokenType`, and advertised `appointment.startTime`, which the queue
 * repository never selects).
 */
export type QueueItem = QueueToken;