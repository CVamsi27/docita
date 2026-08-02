import { z } from "zod";
import { APIRequestError } from "@workspace/data-access";

export const followUpSchema = z.object({
  id: z.string(),
  scheduledDate: z.string(),
  reason: z.string(),
  status: z.string(),
  patient: z.object({
    id: z.string(),
    firstName: z.string(),
    lastName: z.string(),
  }),
  doctor: z.object({
    id: z.string(),
    name: z.string(),
  }),
});

export type FollowUp = z.infer<typeof followUpSchema>;

export function parseFollowUpList(data: unknown): FollowUp[] {
  if (!Array.isArray(data)) {
    return [];
  }
  return data.flatMap((item) => {
    const parsed = followUpSchema.safeParse(item);
    return parsed.success ? [parsed.data] : [];
  });
}

export function isExpectedAccessFailure(err: unknown): boolean {
  if (!(err instanceof APIRequestError)) return false;
  const status = err.status;
  return status === 401 || status === 403 || status === 404;
}

export function logPayloadFromError(err: unknown): Record<string, unknown> {
  if (err instanceof APIRequestError) {
    return {
      status: err.status,
      code: err.code,
    };
  }
  return { error: err instanceof Error ? err.message : String(err) };
}
