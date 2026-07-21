"use client";

import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/feedback/alert";
import type { PublicBookingPageController } from "@/features/public-booking/use-public-booking-page-state";

export function PublicBookingSubmitAlerts({
  c,
}: {
  c: PublicBookingPageController;
}) {
  return (
    <>
      {c.submitGeneralMessage ? (
        <Alert
          variant="destructive"
          className="rounded-[var(--radius-md)] border text-left [&>svg]:top-3.5"
        >
          <AlertTitle className="text-[length:var(--fs-sm)]">
            Unable to send your request
          </AlertTitle>
          <AlertDescription className="text-[length:var(--fs-xs)] leading-relaxed">
            {c.submitGeneralMessage}
          </AlertDescription>
        </Alert>
      ) : null}

      {c.unknownSubmitErrors.length > 0 ? (
        <Alert
          variant="destructive"
          className="rounded-[var(--radius-md)] border text-left [&>svg]:top-3.5"
        >
          <AlertTitle className="text-[length:var(--fs-sm)]">
            Check these issues
          </AlertTitle>
          <AlertDescription>
            <ul className="mt-1 list-disc space-y-1 pl-4 text-[length:var(--fs-xs)] leading-relaxed">
              {c.unknownSubmitErrors.map(([fieldKey, msg]) => (
                <li key={fieldKey || "issue"}>{msg}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      ) : null}
    </>
  );
}
