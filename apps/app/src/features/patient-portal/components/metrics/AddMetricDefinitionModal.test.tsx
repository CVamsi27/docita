import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AddMetricDefinitionModal } from "./add-metric-definition-modal";

const portalMetricMocks = vi.hoisted(() => ({
  mutateAsync: vi.fn(),
}));

const patientPortalMessages = vi.hoisted(() => ({
  addMetricDefinition: {
    errorNameRequired: "Enter a metric name",
    errorCategoryRequired: "Choose a category",
    errorSaveFailed: "We could not create this metric. Please try again.",
    title: "Add Custom Metric",
    description: "Define a patient portal metric that can be tracked over time.",
    nameLabel: "Metric name",
    namePlaceholder: "Metric name",
    categoryLabel: "Category",
    categoryPlaceholder: "Category",
    valueTypeLabel: "Value type",
    unitLabel: "Unit (optional)",
    unitPlaceholder: "Unit",
    cancelButton: "Cancel",
    creatingButton: "Creating…",
    createButton: "Create Metric",
  },
}));

vi.mock("@workspace/data-access", () => ({
  useCreatePortalMetricDefinition: () => ({
    mutateAsync: portalMetricMocks.mutateAsync,
    isPending: false,
  }),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => {
    const t = (key: string): string => {
      const resolved = key.split(".").reduce<unknown>(
        (acc, part) =>
          acc && typeof acc === "object"
            ? (acc as Record<string, unknown>)[part]
            : undefined,
        patientPortalMessages,
      );
      return typeof resolved === "string" ? resolved : key;
    };
    return { t };
  },
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

    fireEvent.change(screen.getByLabelText("Metric name"), {
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

    fireEvent.change(screen.getByLabelText("Metric name"), {
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
