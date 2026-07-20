import { fireEvent, screen, waitFor } from "@testing-library/react";
import { render } from "@/test-utils/render-with-tooltip";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CustomField } from "@workspace/types";
import { CustomFieldsSettings } from "./CustomFieldsSettings";

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  fields: [] as CustomField[],
  isLoading: false,
  isError: false,
}));

const messages = {
  Settings: {
    CustomFields: {
      editDialogTitle: "Edit custom field",
      addDialogTitle: "Add custom field",
      editDialogDescription: "Update this custom field definition.",
      addDialogDescription:
        "Define an extra field to capture on patient records.",
      fieldNameLabel: "Field name",
      fieldNamePlaceholder: "e.g. Referring doctor",
      fieldTypeLabel: "Field type",
      fieldTypePlaceholder: "Select a type",
      optionsLabel: "Dropdown options",
      optionsPlaceholder: "Comma-separated, e.g. Low, Medium, High",
      optionsDescription: "Separate each choice with a comma.",
      requiredLabel: "Required",
      requiredDescription: "Staff must fill this in before saving.",
      cancelButton: "Cancel",
      savingButton: "Saving…",
      saveChangesButton: "Save changes",
      addFieldButton: "Add field",
      deleteConfirmTitle: "Remove custom field?",
      deleteConfirmDescription:
        "This field will no longer be captured on new patient records. Existing values are not deleted.",
      deleteConfirmButton: "Remove",
      nameColumn: "Name",
      typeColumn: "Type",
      requiredColumn: "Required",
      requiredCell: "Required",
      optionalCell: "Optional",
      editAriaLabel: "Edit {name}",
      removeAriaLabel: "Remove {name}",
      title: "Custom Fields",
      description:
        "Capture extra information on patient records specific to your clinic.",
      emptyTitle: "No custom fields yet",
      emptyDescription:
        "Add fields to capture information beyond the standard patient record.",
    },
  },
};

vi.mock("@workspace/data-access", async () => {
  const actual = await vi.importActual<typeof import("@workspace/data-access")>(
    "@workspace/data-access",
  );
  return {
    ...actual,
    useCustomFields: () => ({
      data: mocks.fields,
      isLoading: mocks.isLoading,
      isError: mocks.isError,
      refetch: vi.fn(),
    }),
    useCreateCustomField: () => ({ mutate: mocks.create, isPending: false }),
    useUpdateCustomField: () => ({ mutate: mocks.update, isPending: false }),
    useDeleteCustomField: () => ({ mutate: mocks.remove, isPending: false }),
  };
});

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

function makeField(overrides: Partial<CustomField> = {}): CustomField {
  return {
    id: "cf_1",
    name: "Referring doctor",
    fieldType: "text",
    options: null,
    required: false,
    order: 0,
    clinicId: "clinic_1",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("CustomFieldsSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.fields = [];
    mocks.isLoading = false;
    mocks.isError = false;
  });

  it("shows the empty state when there are no custom fields", () => {
    render(<CustomFieldsSettings />, { messages });
    expect(screen.getByText("No custom fields yet")).toBeInTheDocument();
  });

  it("renders a row per defined field with its type label", () => {
    mocks.fields = [
      makeField({ id: "cf_1", name: "Referring doctor", fieldType: "text" }),
      makeField({ id: "cf_2", name: "Risk level", fieldType: "select", required: true }),
    ];
    render(<CustomFieldsSettings />, { messages });

    expect(screen.getByText("Referring doctor")).toBeInTheDocument();
    expect(screen.getByText("Risk level")).toBeInTheDocument();
    expect(screen.getByText("Dropdown")).toBeInTheDocument();
    // One "Optional" cell (text field) and one "Required" cell (select field),
    // plus the "Required" column header → assert on the distinct Optional cell.
    expect(screen.getByText("Optional")).toBeInTheDocument();
  });

  it("opens the create dialog from the Add field action", async () => {
    render(<CustomFieldsSettings />, { messages });
    fireEvent.click(screen.getByRole("button", { name: /add field/i }));

    await waitFor(() => {
      expect(screen.getByText("Add custom field")).toBeInTheDocument();
    });
  });

  it("prompts for confirmation before deleting a field", async () => {
    mocks.fields = [makeField({ id: "cf_9", name: "Allergy note" })];
    render(<CustomFieldsSettings />, { messages });

    fireEvent.click(screen.getByRole("button", { name: /remove allergy note/i }));

    await waitFor(() => {
      expect(screen.getByText("Remove custom field?")).toBeInTheDocument();
    });
    // The mutation only fires once the confirmation is accepted.
    expect(mocks.remove).not.toHaveBeenCalled();
  });
});
