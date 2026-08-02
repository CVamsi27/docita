import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { InventoryAddItemDialogUI } from "./InventoryAddItemDialogUI";

vi.mock("react-i18next", () => ({
  useTranslation: (ns?: string) => {
    const t = (key: string): string => {
      const map: Record<string, string> = {
        "Dialogs.inventoryAddItem.title": "Add Inventory Item",
        "Dialogs.inventoryAddItem.description": "Add a new item to your inventory",
        "Dialogs.inventoryAddItem.submitLabel": "Add item",
        "Dialogs.inventoryAddItem.itemName": "Item name",
        "Dialogs.inventoryAddItem.category": "Category",
        "Dialogs.inventoryAddItem.quantity": "Quantity",
        "Dialogs.inventoryAddItem.minStock": "Minimum Stock Level",
        "Dialogs.inventoryAddItem.expiryDate": "Expiry Date",
        "Dialogs.inventoryAddItem.expiryDatePlaceholder": "Expiry date",
        "Enter item name.": "Enter item name.",
        "Enter category.": "Enter category.",
      };
      return map[`${ns ?? ""}.${key}`] ?? map[key] ?? key;
    };
    return { t };
  },
}));

describe("InventoryAddItemDialogUI", () => {
  it("shows required validation and keeps submit from firing", async () => {
    const onSubmit = vi.fn();

    render(
      <InventoryAddItemDialogUI
        isOpen
        isLoading={false}
        onClose={vi.fn()}
        onSubmit={onSubmit}
        categories={[{ label: "Medicine", value: "medicine" }]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Add item" }));

    expect(await screen.findByText("Enter item name.")).toBeInTheDocument();
    expect(screen.getByText("Enter category.")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits a valid inventory item and supports cancel", async () => {
    const onSubmit = vi.fn();
    const onClose = vi.fn();

    render(
      <InventoryAddItemDialogUI
        isOpen
        isLoading={false}
        onClose={onClose}
        onSubmit={onSubmit}
        defaultValues={{ category: "medicine" }}
        categories={[{ label: "Medicine", value: "medicine" }]}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText("Item name"), {
      target: { value: "Paracetamol 500mg" },
    });
    fireEvent.change(screen.getByPlaceholderText("Quantity"), {
      target: { value: "25" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add item" }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Paracetamol 500mg",
          category: "medicine",
          quantity: "25",
        }),
      );
    });

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalled();
  });
});
