import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RecordMetricModal } from "./record-metric-modal";

const portalMetricMocks = vi.hoisted(() => ({
  mutateAsync: vi.fn(),
}));

vi.mock("@workspace/data-access", () => ({
  useRecordPortalMetricValue: () => ({
    mutateAsync: portalMetricMocks.mutateAsync,
    isPending: false,
  }),
}));

describe("RecordMetricModal", () => {
  beforeEach(() => {
    portalMetricMocks.mutateAsync.mockReset();
  });

  it("requires a value before saving", async () => {
    render(
      <RecordMetricModal
        open
        onClose={vi.fn()}
        definition={{ id: "metric_1", label: "Blood Sugar", valueType: "NUMBER" }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Enter a value")).toBeInTheDocument();
    expect(portalMetricMocks.mutateAsync).not.toHaveBeenCalled();
  });

  it("submits a valid numeric reading with notes", async () => {
    portalMetricMocks.mutateAsync.mockResolvedValue(undefined);
    const onClose = vi.fn();
    const onSuccess = vi.fn();

    render(
      <RecordMetricModal
        open
        onClose={onClose}
        onSuccess={onSuccess}
        definition={{
          id: "metric_1",
          label: "Blood Sugar",
          unit: "mg/dL",
          valueType: "NUMBER",
        }}
      />,
    );

    fireEvent.change(screen.getByLabelText("Value (mg/dL)"), {
      target: { value: "98" },
    });
    fireEvent.change(screen.getByLabelText("Notes (optional)"), {
      target: { value: "Fasting reading" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(portalMetricMocks.mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          definitionId: "metric_1",
          valueNumber: 98,
          notes: "Fasting reading",
        }),
      );
    });
    expect(onSuccess).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});
