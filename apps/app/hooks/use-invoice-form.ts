import { useState, useRef, useMemo } from "react";
import { toast } from "sonner";
import { LineItem } from "@workspace/types";
import { apiFetch } from "@/lib/api-client";
import { useAppConfig } from "@/lib/app-config-context";

interface UseInvoiceFormProps {
  appointmentId?: string;
  patientId: string;
  onInvoiceCreated?: () => void;
}

export function useInvoiceForm({
  appointmentId,
  patientId,
  onInvoiceCreated,
}: UseInvoiceFormProps) {
  const { config } = useAppConfig();
  const defaultItems = config.defaults.invoiceItems;

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("pending");

  // Track which defaultItems version we've initialized with
  const lastDefaultItemsRef = useRef(defaultItems);
  const [items, setItems] = useState<LineItem[]>(() =>
    defaultItems.map((item) => ({ ...item })),
  );

  // Sync items when defaultItems change (without useEffect)
  if (defaultItems !== lastDefaultItemsRef.current && defaultItems.length > 0) {
    lastDefaultItemsRef.current = defaultItems;
    setItems(defaultItems.map((item) => ({ ...item })));
  }

  const addItem = (item?: Partial<LineItem>) => {
    const newItem: LineItem = {
      description: item?.description || "",
      quantity: item?.quantity || 1,
      price: item?.price || 0,
    };
    setItems([...items, newItem]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (
    index: number,
    field: keyof LineItem,
    value: string | number,
  ) => {
    const updated = [...items];
    if (updated[index]) {
      updated[index][field] = value as never;
      setItems(updated);
    }
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + item.quantity * item.price, 0);
  };

  const resetItems = () => {
    setItems(defaultItems.map((item) => ({ ...item })));
  };

  const handleSubmit = async (e: React.FormEvent, onSuccess?: () => void) => {
    e.preventDefault();
    setLoading(true);

    try {
      await apiFetch(`/invoices`, {
        method: "POST",
        body: JSON.stringify({
          appointmentId,
          patientId,
          total: calculateTotal(),
          status,
          items: items.filter((item) => item.description.trim() !== ""),
        }),
      });

      resetItems();
      setStatus("pending");
      onInvoiceCreated?.();
      onSuccess?.();
      toast.success("Invoice created successfully");
    } catch (error) {
      console.error("Failed to create invoice:", error);
      toast.error("Failed to create invoice");
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    status,
    setStatus,
    items,
    addItem,
    removeItem,
    updateItem,
    calculateTotal,
    handleSubmit,
  };
}
