import { api } from "@/lib/api-client";

type SlotRow = {
  time: string;
  doctorId: string;
  isAvailable: boolean;
};

export async function fetchFirstAvailableDatetimeLocal(
  calendarDate: string | Date,
  doctorId: string,
): Promise<string | null> {
  const d = new Date(calendarDate);
  const params = new URLSearchParams({
    date: d.toISOString(),
    doctorId,
  });
  const slots = await api.get<SlotRow[]>(
    `/doctor-availability/slots?${params.toString()}`,
  );
  const first = slots.find(
    (s) => s.doctorId === doctorId && s.isAvailable === true,
  );
  if (!first?.time) {
    return null;
  }
  const parts = first.time.split(":").map((x) => parseInt(x, 10));
  const h = parts[0];
  const m = parts[1];
  if (h === undefined || m === undefined) {
    return null;
  }
  const merged = new Date(d);
  merged.setHours(h, m, 0, 0);
  const offsetMs = merged.getTimezoneOffset() * 60 * 1000;
  return new Date(merged.getTime() - offsetMs).toISOString().slice(0, 16);
}
