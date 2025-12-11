import { useState, useRef, useMemo, useEffect } from "react";
import { toast } from "sonner";
import { LineItem, type Specialization } from "@workspace/types";
import { apiFetch } from "@/lib/api-client";
import { useAppConfig } from "@/lib/app-config-context";

const SPECIALTY_CONSULTATION_FEES: Record<Specialization, number> = {
  GENERAL_PRACTICE: 500,
  DENTAL: 500,
  CARDIOLOGY: 1000,
  ORTHOPEDICS: 900,
  PEDIATRICS: 600,
  GYNECOLOGY: 800,
  DERMATOLOGY: 700,
  NEUROLOGY: 1100,
  PSYCHIATRY: 900,
  RADIOLOGY: 1000,
  OPHTHALMOLOGY: 800,
  ENT: 700,
  PATHOLOGY: 600,
  PULMONOLOGY: 900,
  ONCOLOGY: 1200,
  NEPHROLOGY: 1000,
  UROLOGY: 900,
  GASTROENTEROLOGY: 950,
  RHEUMATOLOGY: 900,
  ENDOCRINOLOGY: 900,
  ANESTHESIOLOGY: 800,
  EMERGENCY_MEDICINE: 800,
  FAMILY_MEDICINE: 600,
  INTERNAL_MEDICINE: 700,
  PLASTIC_SURGERY: 1500,
  GENERAL_SURGERY: 1500,
  OTHER: 800,
};

interface UseInvoiceFormProps {
  appointmentId?: string;
  patientId: string;
  doctorSpecialization?: Specialization;
  // Doctor context for audit trail (Phase 5)
  doctorName?: string;
  doctorEmail?: string;
  doctorPhone?: string;
  doctorRole?: string;
  doctorRegistrationNumber?: string;
  doctorLicenseNumber?: string;
  onInvoiceCreated?: () => void;
}

export function useInvoiceForm({
  appointmentId,
  patientId,
  doctorSpecialization,
  doctorName,
  doctorEmail,
  doctorPhone,
  doctorRole,
  doctorRegistrationNumber,
  doctorLicenseNumber,
  onInvoiceCreated,
}: UseInvoiceFormProps) {
  const { config } = useAppConfig();
  const defaultItems = config.defaults.invoiceItems;

  // Generate specialty-based default consultation fee (Phase 4)
  // Memoize to prevent creating new array on every render
  const initialItems = useMemo(() => {
    const basePrice =
      doctorSpecialization && SPECIALTY_CONSULTATION_FEES[doctorSpecialization]
        ? SPECIALTY_CONSULTATION_FEES[doctorSpecialization]
        : defaultItems[0]?.price || 800;

    return [
      {
        description: "Consultation Fee",
        quantity: 1,
        price: basePrice,
      },
    ];
  }, [doctorSpecialization, defaultItems]);

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("pending");

  // Track which defaultItems version we've initialized with
  const lastDefaultItemsRef = useRef(initialItems);
  const [items, setItems] = useState<LineItem[]>(() =>
    initialItems.map((item) => ({ ...item })),
  );

  // Sync items when defaultItems change using useEffect
  useEffect(() => {
    if (
      initialItems !== lastDefaultItemsRef.current &&
      initialItems.length > 0
    ) {
      lastDefaultItemsRef.current = initialItems;
      setItems(initialItems.map((item) => ({ ...item })));
    }
  }, [initialItems]);

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
    setItems(initialItems.map((item) => ({ ...item })));
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
          // Include doctor context for audit trail (Phase 5)
          doctorName,
          doctorEmail,
          doctorPhone,
          doctorSpecialization,
          doctorRole,
          doctorRegistrationNumber,
          doctorLicenseNumber,
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
