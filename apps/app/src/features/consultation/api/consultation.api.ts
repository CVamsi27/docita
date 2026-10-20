import { api } from "@/lib/api/api-client";
import type {
  QueuePatient,
  QueueTokenStatus,
  QueueTokenType,
  TodayQueueResponse,
  UpdateAppointmentRequest,
  VitalSign,
} from "@workspace/types";
import {
  appointmentResponseSchema,
  queueListResponseSchema,
  startConsultationResponseSchema,
  todayQueueResponseSchema,
  updateAppointmentRequestSchema,
  vitalSignSchema,
} from "@workspace/types";

export const consultationApi = {
  // Consultation is represented by the appointment in the API.
  getByAppointmentId: (appointmentId: string) =>
    api.validate(`/appointments/${appointmentId}`, appointmentResponseSchema),

  // Start consultation for an appointment (requires doctor role).
  create: (data: { appointmentId: string }) => {
    const appointmentId = String(data.appointmentId ?? "").trim();
    if (!appointmentId) throw new Error("appointmentId is required to start a consultation");
    return api
      .post(`/appointments/${appointmentId}/start-consultation`, {})
      .then((res) => startConsultationResponseSchema.parse(res));
  },

  // Patch appointment details during consultation (server validates fields).
  update: (appointmentId: string, data: UpdateAppointmentRequest) =>
    api
      .patch(
        `/appointments/${appointmentId}`,
        updateAppointmentRequestSchema.parse(data),
      )
      .then((res) => appointmentResponseSchema.parse(res)),

  addVitals: (appointmentId: string, vitals: VitalSign) =>
    api.post(`/appointments/${appointmentId}/vitals`, vitalSignSchema.parse(vitals)),

  // Mark appointment as completed.
  complete: (appointmentId: string) =>
    api.patch(`/appointments/${appointmentId}`, { status: "completed" }),
};

/**
 * The doctor now/next and nurse prep panels both render queue rows. The row is
 * a projection, not a wire shape: `GET /queue` nests `chiefComplaint` and
 * `type` under `appointment` while `GET /queue/today` flattens them, so both are
 * normalized here and the sections read a single field.
 */
export interface ConsultationQueueRow {
  id: string;
  appointmentId: string | null;
  patientId: string | null;
  patientName: string;
  status: QueueTokenStatus;
  startTime: string | null;
  chiefComplaint: string | null;
  type: string | null;
  tokenNumber: number;
  tokenType: QueueTokenType;
  /** Chief complaint, else visit type, else token type — see `getOpdQueueSummaryLine`. */
  visitSummary: string;
  kind: "appointment" | "queue";
  createdAt: string;
  patient: QueuePatient;
}

export interface ConsultationDashboardStats {
  scheduledToday: number;
  waiting: number;
  inProgress: number;
  completed: number;
}

export interface ConsultationDoctorNextNow {
  mode: "fcfs" | "scheduled";
  inProgress: ConsultationQueueRow[];
  combinedUpcoming: ConsultationQueueRow[];
}

/**
 * Queue endpoints are served by `QueueController` at `/queue`. The previous
 * `/consultation/*` paths matched no controller at all — there is no
 * `@Controller('consultation')` — so this dashboard, which backs the live
 * `/consultation` route, could only ever render its error state.
 * `consultation-dashboard-endpoints.test.ts` pins the paths.
 *
 * Responses are parsed with the shared `queueListResponseSchema` /
 * `todayQueueResponseSchema`, so server drift fails loudly here instead of
 * silently reshaping rows downstream.
 *
 * No `doctorId` is sent: `QueueController` already forces a doctor onto their
 * own queue via `resolveDoctorScopedAppointmentFilter`, while clinic-wide roles
 * (nurse, receptionist, admin) get the whole clinic. Passing the current user
 * id would filter a nurse's queue down to tokens assigned to that nurse, which
 * is never what the dashboard wants.
 */
export const consultationDashboardApi = {
  /** The day's full queue; the rollup carries the dashboard counters. */
  getToday: (): Promise<TodayQueueResponse> =>
    api.validate("/queue/today", todayQueueResponseSchema),

  /** Active queue only (WAITING + IN_PROGRESS). */
  getQueue: () => api.validate("/queue", queueListResponseSchema),

  /** Starting a consultation is an appointment transition. */
  start: (appointmentId: string) =>
    consultationApi.create({ appointmentId }),
};
