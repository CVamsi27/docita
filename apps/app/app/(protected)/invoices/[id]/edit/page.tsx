"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@workspace/ui/components/button";
import { useSmartBack } from "@/hooks/use-smart-back";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";
import { ArrowLeft, Save, Plus, Trash2 } from "lucide-react";
import { apiHooks } from "@/lib/api-hooks";

interface InvoiceItem {
  id?: string;
  description: string;
  quantity: number;
  price: number;
}

export default function InvoiceEditPage() {
  const params = useParams();
  const router = useRouter();
  const invoiceId = params.id as string;

  const { data: invoice, isLoading: loading } = apiHooks.useInvoice(invoiceId);
  const updateInvoice = apiHooks.useUpdateInvoice(invoiceId);
  const goBack = useSmartBack(`/invoices/${invoiceId}`);

  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [notes, setNotes] = useState("");

  // Ref-based sync for syncing state when invoice changes
  const lastInvoiceIdRef = useRef<string | null>(null);
  if (invoice && invoice.id !== lastInvoiceIdRef.current) {
    lastInvoiceIdRef.current = invoice.id ?? null;
    setItems(invoice.items || []);
    setNotes(invoice.notes || "");
  }

  const handleSave = async () => {
    try {
      await updateInvoice.mutateAsync({
        items,
        notes,
        totalAmount: calculateTotal(),
      });
      toast.success("Invoice updated successfully");
      router.push(`/invoices/${invoiceId}`);
    } catch (error) {
      console.error("Save invoice error:", error);
      toast.error("Failed to save invoice. Please try again.");
    }
  };

  const addItem = () => {
    setItems([...items, { description: "", quantity: 1, price: 0 }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (
    index: number,
    field: keyof InvoiceItem,
    value: string | number,
  ) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value } as InvoiceItem;
    setItems(newItems);
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + item.quantity * item.price, 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Loading invoice...</p>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <p className="text-muted-foreground">Invoice not found</p>
        <Button onClick={() => router.push("/invoices")}>
          Back to Invoices
        </Button>
      </div>
    );
  }

  const patientName = invoice.patient
    ? `${invoice.patient.firstName} ${invoice.patient.lastName}`
    : "Patient";

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={goBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Edit Invoice</h1>
            <p className="text-sm text-muted-foreground">{patientName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={goBack}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={updateInvoice.isPending}>
            <Save className="mr-2 h-4 w-4" />
            {updateInvoice.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* Invoice Items */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Invoice Items</CardTitle>
            <Button onClick={addItem} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Item
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {items.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No items added. Click &quot;Add Item&quot; to get started.
            </p>
          ) : (
            items.map((item, index) => (
              <div
                key={index}
                className="grid grid-cols-12 gap-4 items-end p-4 border rounded-lg"
              >
                <div className="col-span-5">
                  <Label htmlFor={`description-${index}`}>Description</Label>
                  <Input
                    id={`description-${index}`}
                    value={item.description}
                    onChange={(e) =>
                      updateItem(index, "description", e.target.value)
                    }
                    placeholder="Item description"
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor={`quantity-${index}`}>Quantity</Label>
                  <Input
                    id={`quantity-${index}`}
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) =>
                      updateItem(
                        index,
                        "quantity",
                        parseInt(e.target.value) || 1,
                      )
                    }
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor={`price-${index}`}>Price</Label>
                  <Input
                    id={`price-${index}`}
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.price}
                    onChange={(e) =>
                      updateItem(
                        index,
                        "price",
                        parseFloat(e.target.value) || 0,
                      )
                    }
                  />
                </div>
                <div className="col-span-2">
                  <Label>Total</Label>
                  <div className="h-10 flex items-center font-semibold">
                    ₹{(item.quantity * item.price).toFixed(2)}
                  </div>
                </div>
                <div className="col-span-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeItem(index)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}

          {items.length > 0 && (
            <div className="flex justify-end pt-4 border-t">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total Amount</p>
                <p className="text-2xl font-bold">
                  ₹{calculateTotal().toFixed(2)}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any additional notes or instructions..."
            rows={4}
          />
        </CardContent>
      </Card>
    </div>
  );
}
