import { apiPath, getAuthHeaders } from "@/lib/api/api-client";

/**
 * Fetches the printable OPD prescription slip PDF for an appointment.
 *
 * The slip endpoint streams a binary PDF, so this adapter reads it as a blob
 * instead of routing through the JSON API client. The file lives in the
 * feature `api/` directory (the allowlisted boundary in
 * `check:frontend-fetch`) rather than calling `fetch` from the hook.
 */
export async function downloadOpdSlipPdf(
  appointmentId: string,
): Promise<Blob> {
  const response = await fetch(
    apiPath(`/appointments/${appointmentId}/opd-slip`),
    {
      headers: getAuthHeaders(),
    },
  );
  if (!response.ok) {
    throw new Error(
      "We could not generate the OPD prescription slip. Please try again.",
    );
  }
  return response.blob();
}
