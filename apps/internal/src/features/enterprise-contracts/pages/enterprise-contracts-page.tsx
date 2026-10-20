import { useState, useMemo } from "react";
import { AppPageScaffold, Badge, Button, Card, CardContent, CardHeader, CardTitle, DataState, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, PageHeader, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Label } from "@workspace/ui/components";
import { FileSpreadsheet, FileText } from "lucide-react";
import {
  formatCurrency,
  formatDateTime,
  WHOLE_AMOUNT_CURRENCY_OPTIONS,  enIN,
} from "@workspace/utils"
import { useApiQuery } from "@/hooks/use-api-query";

interface Contract { id: string; clinicName: string; tier: string; startDate: string; endDate?: string; status: string; monthlyAmount: number; currency: string; customLimits?: Record<string, number>; notes?: string; }

export function EnterpriseContractsPage() {
  const { data: contracts = [], isLoading, isError, refetch } = useApiQuery<Contract[]>("/api/internal/enterprise-contracts");
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);

  const activeContracts = useMemo(() => contracts.filter((c) => c.status === "ACTIVE"), [contracts]);
  const totalMrr = useMemo(() => contracts.reduce((sum, c) => sum + c.monthlyAmount, 0), [contracts]);

  return (
    <AppPageScaffold header={<PageHeader title="Enterprise Contracts" description="Manage custom enterprise agreements, custom pricing, and contract lifecycle" size="compact" />}>
      <DataState
        status={isError ? "error" : isLoading ? "loading" : "success"}
        loadingMessage="Loading contracts..."
        errorMessage="We could not load enterprise contracts. Please try again."
        onRetry={() => { void refetch(); }}
      >
        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <Card><CardHeader><CardTitle className="text-sm font-medium">Total Contracts</CardTitle></CardHeader><CardContent><p className="text-2xl font-semibold tabular-nums">{contracts.length}</p></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm font-medium">Active Contracts</CardTitle></CardHeader><CardContent><p className="text-2xl font-semibold tabular-nums">{activeContracts.length}</p></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm font-medium">Total MRR</CardTitle></CardHeader><CardContent><p className="text-2xl font-semibold tabular-nums">{formatCurrency(totalMrr, WHOLE_AMOUNT_CURRENCY_OPTIONS)}</p></CardContent></Card>
        </div>

        <Card><CardHeader><CardTitle className="flex items-center gap-2"><FileSpreadsheet className="h-5 w-5" /> All Enterprise Contracts ({contracts.length})</CardTitle></CardHeader>
          <CardContent>{contracts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground"><FileText className="h-10 w-10 mb-4" /><p>No enterprise contracts yet</p></div>
          ) : (
            <div className="rounded-md border"><Table><TableHeader><TableRow>
              <TableHead>Clinic</TableHead><TableHead>Tier</TableHead><TableHead>Status</TableHead><TableHead>Monthly</TableHead><TableHead>Start Date</TableHead><TableHead className="text-right">Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>{contracts.map((contract) => (
              <TableRow key={contract.id}>
                <TableCell className="font-medium">{contract.clinicName}</TableCell>
                <TableCell><Badge variant="outline">{contract.tier}</Badge></TableCell>
                <TableCell><Badge variant={contract.status === "ACTIVE" ? "default" : "secondary"}>{contract.status}</Badge></TableCell>
                <TableCell>{formatCurrency(contract.monthlyAmount, { currency: contract.currency, fractionDigits: 0, locale: "en-IN" })}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{formatDateTime(contract.startDate, undefined, { locale: enIN })}</TableCell>
                <TableCell className="text-right"><Button variant="ghost" size="sm" onClick={() => { setSelectedContract(contract); setIsViewOpen(true); }}><FileText className="h-4 w-4 mr-2" />View</Button></TableCell>
              </TableRow>
            ))}</TableBody></Table></div>
          )}</CardContent>
        </Card>
      </DataState>

      <Dialog open={isViewOpen} onOpenChange={(o) => { setIsViewOpen(o); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Contract Details</DialogTitle><DialogDescription>{selectedContract?.clinicName}</DialogDescription></DialogHeader>
          {selectedContract && <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-muted-foreground">Tier</Label><p className="font-medium">{selectedContract.tier}</p></div>
              <div><Label className="text-muted-foreground">Monthly Amount</Label><p className="font-medium">{formatCurrency(selectedContract.monthlyAmount, { currency: selectedContract.currency, locale: "en-IN", ...WHOLE_AMOUNT_CURRENCY_OPTIONS })}</p></div>
              <div><Label className="text-muted-foreground">Status</Label><Badge>{selectedContract.status}</Badge></div>
              <div><Label className="text-muted-foreground">Start Date</Label><p className="font-medium">{formatDateTime(selectedContract.startDate, undefined, { locale: enIN })}</p></div>
              {selectedContract.endDate && <div><Label className="text-muted-foreground">End Date</Label><p className="font-medium">{formatDateTime(selectedContract.endDate, undefined, { locale: enIN })}</p></div>}
            </div>
            {selectedContract.notes && <div><Label className="text-muted-foreground">Notes</Label><p className="text-sm mt-1">{selectedContract.notes}</p></div>}
          </div>}
        </DialogContent>
      </Dialog>
    </AppPageScaffold>
  );
}
