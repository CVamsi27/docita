import { describe, expect, it } from "vitest";
import type { QueueItem } from "@workspace/data-access";
import type { AppointmentListItemContractResponse } from "@workspace/types";
import {
  buildActiveConsultations,
  buildInProgressAppointmentQueueItem,
  buildOpdQueueRows,
  buildWaitingList,
  collectInProgressAppointmentQueueItems,
  rankQueueItem,
} from "./consultation-dashboard-queue";

const isLocalToday = () => true;

function makeQueueItem(overrides: Partial<QueueItem> = {}): QueueItem {
  return {
    id: "q-1",
    clinicId: "c-1",
    patientId: "p-1",
    appointmentId: "a-1",
    doctorId: "d-1",
    tokenNumber: 1,
    status: "WAITING",
    priority: 0,
    createdAt: "2026-06-08T08:00:00.000Z",
    tokenType: "scheduled",
    estimatedDuration: 30,
    estimatedWaitTime: 0,
    ...overrides,
  } as QueueItem;
}

function makeInProgressAppointment(
  overrides: Partial<AppointmentListItemContractResponse> = {},
): AppointmentListItemContractResponse {
  return {
    id: "a-1",
    clinicId: "c-1",
    patientId: "p-1",
    doctorId: "d-1",
    startTime: "2026-06-08T09:00:00.000Z",
    updatedAt: "2026-06-08T09:00:00.000Z",
    status: "in-progress",
    ...overrides,
  } as AppointmentListItemContractResponse;
}

describe("buildWaitingList", () => {
  it("returns only queue items in WAITING status", () => {
    const queue: QueueItem[] = [
      makeQueueItem({ id: "q1", status: "WAITING" }),
      makeQueueItem({ id: "q2", status: "IN_PROGRESS" }),
      makeQueueItem({ id: "q3", status: "WAITING" }),
      makeQueueItem({ id: "q4", status: "COMPLETED" }),
    ];
    const waiting = buildWaitingList(queue);
    expect(waiting.map((q) => q.id)).toEqual(["q1", "q3"]);
  });

  it("returns empty array when no WAITING items", () => {
    expect(buildWaitingList([])).toEqual([]);
    expect(
      buildWaitingList([
        makeQueueItem({ status: "IN_PROGRESS" }),
        makeQueueItem({ status: "COMPLETED" }),
      ]),
    ).toEqual([]);
  });
});

describe("buildInProgressAppointmentQueueItem", () => {
  it("maps an appointment with patient data to a QueueItem", () => {
    const appt = makeInProgressAppointment({
      id: "a-1",
      patient: { id: "p-1", firstName: "John", lastName: "Doe", phoneNumber: "555" },
      doctorId: "d-1",
      doctor: { id: "d-1", name: "Dr. Smith" },
      type: "FOLLOW_UP",
      chiefComplaint: "Cough",
    });
    const item = buildInProgressAppointmentQueueItem(appt, "2026-06-08T10:00:00.000Z");
    expect(item).toMatchObject({
      id: "in-progress-appt-a-1",
      clinicId: "c-1",
      patientId: "p-1",
      appointmentId: "a-1",
      doctorId: "d-1",
      status: "IN_PROGRESS",
      tokenNumber: 0,
      createdAt: "2026-06-08T10:00:00.000Z",
    });
    expect(item.patient).toMatchObject({ firstName: "John", lastName: "Doe" });
    expect(item.appointment).toMatchObject({ doctor: { name: "Dr. Smith" }, type: "FOLLOW_UP", chiefComplaint: "Cough" });
  });

  it("handles null patient gracefully", () => {
    const appt = makeInProgressAppointment({ patient: undefined });
    const item = buildInProgressAppointmentQueueItem(appt, "2026-06-08T10:00:00.000Z");
    expect(item.patient).toBeUndefined();
  });

  it("handles null appointment gracefully", () => {
    const appt = { ...makeInProgressAppointment({ id: undefined as unknown as string }), appointment: undefined };
    const item = buildInProgressAppointmentQueueItem(appt as unknown as AppointmentListItemContractResponse, "2026-06-08T10:00:00.000Z");
    expect(item.appointment).toBeUndefined();
  });
});

describe("collectInProgressAppointmentQueueItems", () => {
  it("collects un-covered in-progress appointments for today", () => {
    const appointments = [
      makeInProgressAppointment({ id: "a-1" }),
      makeInProgressAppointment({ id: "a-2" }),
    ];
    const items = collectInProgressAppointmentQueueItems(appointments, new Set(["a-1"]), isLocalToday);
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe("in-progress-appt-a-2");
  });

  it("skips appointments not in in-progress status", () => {
    const appointments = [makeInProgressAppointment({ status: "completed" as const })];
    const items = collectInProgressAppointmentQueueItems(appointments, new Set(), isLocalToday);
    expect(items).toHaveLength(0);
  });

  it("skips appointments not today", () => {
    const appointments = [makeInProgressAppointment({ id: "a-1" })];
    const notToday = () => false;
    const items = collectInProgressAppointmentQueueItems(appointments, new Set(), notToday);
    expect(items).toHaveLength(0);
  });

  it("serializes Date updatedAt to ISO string", () => {
    const appointments = [makeInProgressAppointment({ id: "a-1", updatedAt: new Date("2026-06-08T12:00:00.000Z") })];
    const items = collectInProgressAppointmentQueueItems(appointments, new Set(), isLocalToday);
    expect(items[0].createdAt).toBe("2026-06-08T12:00:00.000Z");
  });
});

describe("rankQueueItem", () => {
  it("returns 0 for IN_PROGRESS", () => {
    expect(rankQueueItem(makeQueueItem({ status: "IN_PROGRESS" }))).toBe(0);
  });

  it("returns 1 for WAITING", () => {
    expect(rankQueueItem(makeQueueItem({ status: "WAITING" }))).toBe(1);
  });

  it("returns 2 for other statuses", () => {
    expect(rankQueueItem(makeQueueItem({ status: "COMPLETED" }))).toBe(2);
    expect(rankQueueItem(makeQueueItem({ status: "CANCELLED" }))).toBe(2);
  });
});

describe("buildActiveConsultations", () => {
  it("returns IN_PROGRESS queue items, then in-progress appointments not already in queue", () => {
    const queue: QueueItem[] = [
      makeQueueItem({ id: "q1", status: "IN_PROGRESS", appointmentId: "a-1" }),
      makeQueueItem({ id: "q2", status: "WAITING", appointmentId: "a-2" }),
    ];
    const appointments: AppointmentListItemContractResponse[] = [
      makeInProgressAppointment({ id: "a-1" }),
      makeInProgressAppointment({ id: "a-2" }),
      makeInProgressAppointment({ id: "a-3" }),
    ];
    const active = buildActiveConsultations(queue, appointments, isLocalToday);
    expect(active.map((q) => q.id)).toEqual([
      "q1",
      "in-progress-appt-a-2",
      "in-progress-appt-a-3",
    ]);
  });

  it("serializes Date updatedAt to ISO string", () => {
    const queue: QueueItem[] = [
      makeQueueItem({ id: "q1", status: "IN_PROGRESS", appointmentId: "a-1" }),
    ];
    const appointments: AppointmentListItemContractResponse[] = [
      makeInProgressAppointment({
        id: "a-2",
        updatedAt: new Date("2026-06-08T10:00:00.000Z"),
      }),
    ];
    const active = buildActiveConsultations(queue, appointments, isLocalToday);
    expect(active[1].createdAt).toBe("2026-06-08T10:00:00.000Z");
  });

  it("handles appointments with no patient", () => {
    const queue: QueueItem[] = [];
    const appointments: AppointmentListItemContractResponse[] = [
      makeInProgressAppointment({
        id: "a-1",
        patient: undefined,
      }),
    ];
    const active = buildActiveConsultations(queue, appointments, isLocalToday);
    expect(active[0].patient).toBeUndefined();
    expect(active[0].appointment?.id).toBe("a-1");
  });

  it("skips appointments not in today", () => {
    const queue: QueueItem[] = [];
    const appointments: AppointmentListItemContractResponse[] = [
      makeInProgressAppointment({ id: "a-1" }),
    ];
    const isNotToday = () => false;
    const active = buildActiveConsultations(queue, appointments, isNotToday);
    expect(active).toEqual([]);
  });
});

describe("buildOpdQueueRows", () => {
  it("deduplicates by id and ranks IN_PROGRESS before WAITING", () => {
    const inProgress: QueueItem[] = [
      makeQueueItem({ id: "q1", status: "IN_PROGRESS", tokenNumber: 5 }),
    ];
    const waiting: QueueItem[] = [
      makeQueueItem({ id: "q2", status: "WAITING", tokenNumber: 1 }),
      makeQueueItem({ id: "q3", status: "WAITING", tokenNumber: 2 }),
    ];
    const rows = buildOpdQueueRows(inProgress, waiting);
    expect(rows.map((q) => q.id)).toEqual(["q1", "q2", "q3"]);
  });

  it("sorts WAITING by token number", () => {
    const rows = buildOpdQueueRows(
      [],
      [
        makeQueueItem({ id: "q3", status: "WAITING", tokenNumber: 3 }),
        makeQueueItem({ id: "q1", status: "WAITING", tokenNumber: 1 }),
        makeQueueItem({ id: "q2", status: "WAITING", tokenNumber: 2 }),
      ],
    );
    expect(rows.map((q) => q.id)).toEqual(["q1", "q2", "q3"]);
  });

  it("puts token 0 at the end of WAITING", () => {
    const rows = buildOpdQueueRows(
      [],
      [
        makeQueueItem({ id: "q1", status: "WAITING", tokenNumber: 0 }),
        makeQueueItem({ id: "q2", status: "WAITING", tokenNumber: 5 }),
        makeQueueItem({ id: "q3", status: "WAITING", tokenNumber: 0 }),
      ],
    );
    expect(rows.map((q) => q.id)).toEqual(["q2", "q1", "q3"]);
  });

  it("deduplicates IDs that appear in both active and waiting", () => {
    const inProgress: QueueItem[] = [
      makeQueueItem({ id: "q1", status: "IN_PROGRESS" }),
    ];
    const waiting: QueueItem[] = [
      makeQueueItem({ id: "q1", status: "WAITING" }),
    ];
    const rows = buildOpdQueueRows(inProgress, waiting);
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe("WAITING");
  });

  it("sorts ties by patient lastName, firstName", () => {
    const rows = buildOpdQueueRows(
      [],
      [
        makeQueueItem({
          id: "q1",
          status: "WAITING",
          tokenNumber: 1,
          patient: { firstName: "Alice", lastName: "Smith" },
        }),
        makeQueueItem({
          id: "q2",
          status: "WAITING",
          tokenNumber: 1,
          patient: { firstName: "Bob", lastName: "Adams" },
        }),
      ],
    );
    expect(rows.map((q) => q.id)).toEqual(["q2", "q1"]);
  });
});
