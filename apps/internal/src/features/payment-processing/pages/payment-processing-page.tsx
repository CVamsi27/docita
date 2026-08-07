import { useState, useEffect } from "react";
import { AppPageScaffold, Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, DataState, Input, Label, PageHeader, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components";
import { CreditCard, DollarSign } from "lucide-react";
import { formatCurrency } from "../../../lib/formatters";
import { apiGet, apiPost } from "@/lib/api/api-client";

interface Clinic { id: string; name: string; tier: string; email: string; subscriptionStatus?: string; }
interface Payment { id: string; clinicName: string; planLabel: string; amount: number; currency: string; status: string; paidAt?: string; }

export function PaymentProcessingPage() {
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [selectedClinic, setSelectedClinic] = useState("");
  const [amount, setAmount] = useState("");
  const [newTier, setNewTier] = useState("STARTER");

  const fetchData = async () => {
    setLoading(true);
    try {
      const [clinicData, paymentData] = await Promise.all([
        apiGet<Clinic[]>("/api/internal/clinics"),
        apiGet<Payment[]>("/api/internal/billing/payments"),
      ]);
      setClinics(clinicData);
      setPayments(paymentData);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { void fetchData(); }, []);

  const handleProcessPayment = async () => {
    if (!selectedClinic || !amount) return;
    setProcessing(true);
    try {
      await apiPost(`/api/internal/clinics/${selectedClinic}/process-payment`, {
        paymentId: `manual-${Date.now()}`,
        amount: Number(amount),
        currency: "INR",
        newTier,
        paymentMethod: "MANUAL",
      });
      setAmount("");
      await fetchData();
    } catch { /* ignore */ }
    finally { setProcessing(false); }
  };

  return (
    <AppPageScaffold header={<PageHeader title="Payment Processing" description="Record subscription payments and tier changes" size="compact" />}>
      <DataState status={loading ? "loading" : "success"} loadingMessage="Loading payment processing…">
        <Card className="mb-6">
          <CardHeader><CardTitle>Process Payment</CardTitle><CardDescription>Record a payment and optionally change tier</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Clinic</Label>
              <Select value={selectedClinic} onValueChange={(v) => { setSelectedClinic(v); }}>
                <SelectTrigger><SelectValue placeholder="Select a clinic" /></SelectTrigger>
                <SelectContent>{clinics.map((c) => <SelectItem key={c.id} value={c.id}>{c.name} ({c.tier})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {selectedClinic && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Amount</Label>
                  <Input type="number" value={amount} onChange={(e) => { setAmount(e.target.value); }} placeholder="Enter amount" /></div>
                <div className="space-y-2"><Label>New Tier</Label>
                  <Select value={newTier} onValueChange={(v) => { setNewTier(v); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="STARTER">Starter</SelectItem>
                      <SelectItem value="ESSENTIAL">Essential</SelectItem>
                      <SelectItem value="PROFESSIONAL">Professional</SelectItem>
                      <SelectItem value="HOSPITAL">Hospital</SelectItem>
                      <SelectItem value="ENTERPRISE">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <Button onClick={() => { void handleProcessPayment(); }} disabled={!selectedClinic || !amount || processing}>
              <DollarSign className="h-4 w-4 mr-2" /> {processing ? "Processing…" : "Record Payment"}
            </Button>
          </CardContent>
        </Card>

        <Card><CardHeader><CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5" /> Recent Payments</CardTitle></CardHeader>
          <CardContent>
            <div className="rounded-md border"><Table><TableHeader><TableRow>
              <TableHead>Date</TableHead><TableHead>Clinic</TableHead><TableHead>Plan</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>{payments.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">No payments recorded</TableCell></TableRow>
            ) : payments.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="text-sm">{p.paidAt ? new Date(p.paidAt).toLocaleDateString() : "-"}</TableCell>
                <TableCell className="font-medium">{p.clinicName}</TableCell>
                <TableCell><Badge variant="outline">{p.planLabel}</Badge></TableCell>
                <TableCell>{formatCurrency(p.amount, { currency: "INR", fractionDigits: 0 })}</TableCell>
                <TableCell><Badge variant={p.status === "SUCCESS" ? "secondary" : "destructive"}>{p.status}</Badge></TableCell>
              </TableRow>
            ))}</TableBody></Table></div>
          </CardContent>
        </Card>
      </DataState>
    </AppPageScaffold>
  );
}
