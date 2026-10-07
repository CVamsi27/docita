import { describe, expect, it, vi, beforeEach } from "vitest";
import { consultationDashboardApi } from "@/features/consultation/api/consultation.api";
import { api } from "@/lib/api/api-client";
import {
  queueListResponseSchema,
  todayQueueResponseSchema,
} from "@workspace/types";

vi.mock("@/lib/api/api-client", () => ({
  api: { validate: vi.fn(), post: vi.fn() },
}));

const mockValidate = vi.mocked(api.validate);
const mockPost = vi.mocked(api.post);

/**
 * Regression guard for a permanently-broken page: every call in
 * `consultationDashboardApi` pointed at `/consultation/*`, and **no controller in
 * `apps/api` serves that prefix at all** — there is no `@Controller('consultation')`.
 * Since `ConsultationListPage` is the live `/consultation` route and it renders
 * `ConsultationDashboardUI`, every dashboard query 404'd and the page could only
 * ever show its error state.
 *
 * The real queue endpoints are `GET /queue` (active queue) and `GET /queue/today`
 * (full day + stats), both on `QueueController`.
 *
 * The schema argument matters as much as the path: `api.validate` parses the
 * response, so handing it the shared queue contract is what turns server drift
 * into a loud failure instead of a silently reshaped row.
 */
describe("consultation dashboard endpoints", () => {
  beforeEach(() => {
    mockValidate.mockReset();
    mockPost.mockReset();
  });

  it("reads stats from the served /queue/today endpoint", async () => {
    mockValidate.mockResolvedValue({
      patients: [],
      stats: {
        total: 0,
        pending: 0,
        waiting: 0,
        inProgress: 0,
        completed: 0,
        noShow: 0,
        walkIns: 0,
        scheduled: 0,
        avgConsultationMinutes: 0,
      },
    });
    await consultationDashboardApi.getToday();
    expect(mockValidate).toHaveBeenCalledWith(
      "/queue/today",
      todayQueueResponseSchema,
    );
  });

  it("reads queue rows from the served /queue endpoint", async () => {
    mockValidate.mockResolvedValue([]);
    await consultationDashboardApi.getQueue();
    expect(mockValidate).toHaveBeenCalledWith("/queue", queueListResponseSchema);
  });

  it("never calls the unserved /consultation prefix", async () => {
    mockValidate.mockResolvedValue([]);
    await consultationDashboardApi.getToday();
    await consultationDashboardApi.getQueue();

    for (const [endpoint] of mockValidate.mock.calls) {
      expect(String(endpoint)).not.toMatch(/^\/consultation(\/|$)/);
    }
  });

  it("scopes no doctorId in the query string", async () => {
    mockValidate.mockResolvedValue([]);
    await consultationDashboardApi.getQueue();

    for (const [endpoint] of mockValidate.mock.calls) {
      // QueueController already forces a doctor onto their own queue and gives
      // clinic-wide roles the whole clinic. Sending `doctorId=<userId>` would
      // filter a nurse's queue to tokens assigned to that nurse, which is never
      // what the dashboard wants.
      expect(String(endpoint)).not.toMatch(/doctorId/);
    }
  });

  it("starts a consultation through the appointment transition", async () => {
    mockPost.mockResolvedValue({ appointmentId: "apt-9", status: "in-progress" });
    await consultationDashboardApi.start("apt-9");
    expect(mockPost).toHaveBeenCalledWith(
      "/appointments/apt-9/start-consultation",
      {},
    );
  });
});