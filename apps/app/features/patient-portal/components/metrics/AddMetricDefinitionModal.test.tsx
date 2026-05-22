import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AddMetricDefinitionModal } from "./add-metric-definition-modal";

const portalMetricMocks = vi.hoisted(() => ({
  mutateAsync: vi.fn(),
}));

vi.mock("@workspace/data-access", () => ({
  useCreatePortalMetricDefinition: () => ({
    mutateAsync: portalMetricMocks.mutateAsync,
    isPending: false,
  }),
}));

const categories = [{ id: "cat_vitals", name: "Vitals" }];

describe("AddMetricDefinitionModal", () => {
  beforeEach(() => {
    portalMetricMocks.mutateAsync.mockReset();
  });

  it("requires a metric name and category before creating", async () => {
    render(
      <AddMetricDefinitionModal
        open
        categories={categories}
        onClose={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Create Metric" }));
    expect(await screen.findByText("Enter a metric name")).toBeInTheDocument();
    expect(portalMetricMocks.mutateAsync).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("Metric Name"), {
      target: { value: "Sleep Hours" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Metric" }));
    expect(await screen.findByText("Choose a category")).toBeInTheDocument();
    expect(portalMetricMocks.mutateAsync).not.toHaveBeenCalled();
  });

  it("submits a custom metric and resets the dialog state on success", async () => {
    portalMetricMocks.mutateAsync.mockResolvedValue({});
    const onClose = vi.fn();
    const onSuccess = vi.fn();

    render(
      <AddMetricDefinitionModal
        open
        categories={categories}
        onClose={onClose}
        onSuccess={onSuccess}
      />,
    );

    fireEvent.change(screen.getByLabelText("Metric Name"), {
      target: { value: "Sleep Hours" },
    });
    fireEvent.click(screen.getByRole("combobox", { name: "Category" }));
    fireEvent.click(await screen.findByRole("option", { name: "Vitals" }));
    fireEvent.change(screen.getByLabelText("Unit (optional)"), {
      target: { value: "hours" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Metric" }));

    await waitFor(() => {
      expect(portalMetricMocks.mutateAsync).toHaveBeenCalledWith({
        categoryId: "cat_vitals",
        key: "sleep_hours",
        label: "Sleep Hours",
        valueType: "NUMBER",
        unit: "hours",
        isTrackedByDefault: true,
      });
    });
    expect(onSuccess).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});
