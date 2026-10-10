import { Suspense } from "react";
import { expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@/test-utils";
import { ErrorBoundary } from "@workspace/ui/components/feedback/error-boundary";
import { ConsultationDetailPage } from "./route-pages-clinical";

vi.mock(
  "@/features/consultation/components/ConsultationDetailPageContent",
  () => ({
    default: () => <h1>Synthetic consultation workspace</h1>,
  }),
);

it("loads the registered consultation detail route through one lazy boundary", async () => {
  const handleError = vi.fn();
  render(
    <ErrorBoundary onError={handleError}>
      <Suspense fallback={<p>Loading consultation</p>}>
        <ConsultationDetailPage />
      </Suspense>
    </ErrorBoundary>,
  );
  await waitFor(
    () =>
      expect(
        screen.queryByText("Loading consultation"),
      ).not.toBeInTheDocument(),
    { timeout: 10_000 },
  );
  expect(handleError).not.toHaveBeenCalled();
  expect(
    screen.getByRole("heading", {
      name: "Synthetic consultation workspace",
      level: 1,
    }),
  ).toBeVisible();
});
