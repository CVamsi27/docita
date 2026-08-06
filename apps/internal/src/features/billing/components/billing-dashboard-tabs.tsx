import { Activity, Building2, CreditCard } from "lucide-react";
import { Badge } from "@workspace/ui/components/indicators/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/indicators/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/data-display/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/navigation/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/form/select";
import { Button } from "@workspace/ui/components/form/button";
import { CalendarPlus, Mail } from "lucide-react";
import { formatDate, formatCurrency } from "../../../lib/formatters";

interface Subscription { id: string; clinic: { name: string; email: string; referralCreditsMonths: number }; tier: string; status: string; billingCycle: string; amount: number; currency: string; currentPeriodEnd: string; }
interface Payment { id: string; clinicName: string; planLabel: string; amount: number; currency: string; status: string; paidAt?: string; createdAt: string; gatewayPaymentId?: string; }

interface Props {
  subscriptions: Subscription[]; payments: Payment[]; sending: boolean;
  tierFilter: string; onTierFilterChange: (v: string) => void;
  statusFilter: string; onStatusFilterChange: (v: string) => void;
  billingCycleFilter: string; onBillingCycleFilterChange: (v: string) => void;
  onSendReminder: (sub: Subscription) => void; onExtendGracePeriod: (sub: Subscription) => void;
}

export function BillingDashboardTabs({ subscriptions, payments, sending, tierFilter, onTierFilterChange, statusFilter, onStatusFilterChange, billingCycleFilter, onBillingCycleFilterChange, onSendReminder, onExtendGracePeriod }: Props) {
  return (
    <Tabs defaultValue="subscriptions" className="space-y-4">
      <TabsList>
        <TabsTrigger value="subscriptions"><Building2 className="mr-2 h-4 w-4" /> Subscriptions</TabsTrigger>
        <TabsTrigger value="payments"><CreditCard className="mr-2 h-4 w-4" /> Payments</TabsTrigger>
        <TabsTrigger value="revenue"><Activity className="mr-2 h-4 w-4" /> Revenue</TabsTrigger>
      </TabsList>

      <TabsContent value="subscriptions" className="space-y-4">
        <div className="flex flex-wrap gap-4">
          <Select value={tierFilter} onValueChange={onTierFilterChange}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Tier" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tiers</SelectItem>
              <SelectItem value="STARTER">Starter</SelectItem>
              <SelectItem value="ESSENTIAL">Essential</SelectItem>
              <SelectItem value="PROFESSIONAL">Professional</SelectItem>
              <SelectItem value="HOSPITAL">Hospital</SelectItem>
              <SelectItem value="ENTERPRISE">Enterprise</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={onStatusFilterChange}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="TRIAL">Trial</SelectItem>
              <SelectItem value="PAST_DUE">Past Due</SelectItem>
              <SelectItem value="GRACE_PERIOD">Grace Period</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
              <SelectItem value="EXPIRED">Expired</SelectItem>
            </SelectContent>
          </Select>
          <Select value={billingCycleFilter} onValueChange={onBillingCycleFilterChange}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Billing Cycle" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Cycles</SelectItem>
              <SelectItem value="MONTHLY">Monthly</SelectItem>
              <SelectItem value="YEARLY">Yearly</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card><CardContent className="p-0">
          <Table><TableHeader><TableRow>
            <TableHead>Clinic</TableHead><TableHead>Tier</TableHead><TableHead>Status</TableHead>
            <TableHead>Billing</TableHead><TableHead>Amount</TableHead><TableHead>Period End</TableHead><TableHead>Credits</TableHead><TableHead className="text-right">Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {subscriptions.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="py-8 text-center text-muted-foreground">No subscriptions found</TableCell></TableRow>
            ) : subscriptions.map((sub) => (
              <TableRow key={sub.id}>
                <TableCell><p className="font-medium">{sub.clinic.name}</p><p className="text-xs text-muted-foreground">{sub.clinic.email}</p></TableCell>
                <TableCell><Badge variant="outline">{sub.tier}</Badge></TableCell>
                <TableCell><Badge>{sub.status}</Badge></TableCell>
                <TableCell><span className="text-sm">{sub.billingCycle}</span></TableCell>
                <TableCell><span className="font-medium">{formatCurrency(sub.amount, { currency: sub.currency, fractionDigits: 0 })}</span></TableCell>
                <TableCell><span className="text-sm">{formatDate(sub.currentPeriodEnd)}</span></TableCell>
                <TableCell>{sub.clinic.referralCreditsMonths > 0 && <Badge variant="outline" className="text-success">{sub.clinic.referralCreditsMonths}m free</Badge>}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="ghost" onClick={() => { onSendReminder(sub); }} disabled={sending}><Mail className="h-4 w-4" /></Button>
                    {sub.status === "GRACE_PERIOD" && <Button size="sm" variant="ghost" onClick={() => { onExtendGracePeriod(sub); }}><CalendarPlus className="h-4 w-4" /></Button>}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody></Table>
        </CardContent></Card>
      </TabsContent>

      <TabsContent value="payments">
        <Card><CardHeader><CardTitle>Recent Payments</CardTitle><CardDescription>Latest payment transactions across all clinics</CardDescription></CardHeader>
          <CardContent className="p-0">
            <Table><TableHeader><TableRow>
              <TableHead>Date</TableHead><TableHead>Clinic</TableHead><TableHead>Plan</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead>Gateway ID</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {payments.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">No payments found</TableCell></TableRow>
              ) : payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell><span className="text-sm">{formatDate(payment.paidAt || payment.createdAt)}</span></TableCell>
                  <TableCell><p className="font-medium">{payment.clinicName}</p></TableCell>
                  <TableCell><Badge variant="outline">{payment.planLabel}</Badge></TableCell>
                  <TableCell><span className="font-medium">{formatCurrency(payment.amount, { currency: payment.currency, fractionDigits: 0 })}</span></TableCell>
                  <TableCell><Badge variant={payment.status === "SUCCESS" ? "secondary" : "destructive"}>{payment.status}</Badge></TableCell>
                  <TableCell><code className="text-xs text-muted-foreground">{payment.gatewayPaymentId || "-"}</code></TableCell>
                </TableRow>
              ))}
            </TableBody></Table>
          </CardContent></Card>
      </TabsContent>
    </Tabs>
  );
}
