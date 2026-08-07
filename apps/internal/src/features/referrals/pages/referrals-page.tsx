import { useState, useEffect } from "react";
import { AppPageScaffold, Badge, Card, CardContent, CardDescription, CardHeader, CardTitle, DataState, PageHeader, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components";
import { ArrowLeftRight, TrendingUp, Users } from "lucide-react";
import { formatDate } from "../../../lib/formatters";
import { apiGet } from "@/lib/api/api-client";

interface Referral {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  code?: string | null;
  active: boolean;
  createdAt: string;
}

/** Real contract for GET /api/v1/internal/referral-payouts/summary. */
interface PayoutSummaryRow { status: string; count: number; totalCents: number; }

export function ReferralsPage() {
  const [loading, setLoading] = useState(true);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [stats, setStats] = useState({ total: 0, converted: 0, commission: 0 });

  const fetchReferrals = async () => {
    setLoading(true);
    try {
      const [referrerData, payoutData] = await Promise.all([
        apiGet<Referral[]>("/api/internal/referrers"),
        apiGet<PayoutSummaryRow[]>("/api/internal/referral-payouts/summary"),
      ]);
      setReferrals(referrerData);
      setStats({
        total: referrerData.length,
        converted: referrerData.filter((r) => r.active).length,
        commission: payoutData.reduce((sum, row) => sum + row.totalCents, 0) / 100,
      });
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { void fetchReferrals(); }, []);

  return (
    <AppPageScaffold header={<PageHeader title="Referrals" description="Track referral partners, conversions, and commissions" size="compact" />}>
      <DataState status={loading ? "loading" : "success"} loadingMessage="Loading referrals…">
        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total Referrals</CardTitle><Users className="h-4 w-4 text-muted-foreground" /></CardHeader>
            <CardContent><div className="text-2xl font-semibold tabular-nums">{stats.total}</div></CardContent></Card>
          <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Converted</CardTitle><TrendingUp className="h-4 w-4 text-muted-foreground" /></CardHeader>
            <CardContent><div className="text-2xl font-semibold tabular-nums">{stats.converted}</div></CardContent></Card>
          <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Commission Paid</CardTitle><ArrowLeftRight className="h-4 w-4 text-muted-foreground" /></CardHeader>
            <CardContent><div className="text-2xl font-semibold tabular-nums">\u20b9{stats.commission.toLocaleString()}</div></CardContent></Card>
        </div>

        <Card><CardHeader><CardTitle>All Referrals</CardTitle><CardDescription>{referrals.length} referral record(s)</CardDescription></CardHeader>
          <CardContent>
            {referrals.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                <Users className="h-10 w-10 mb-4" /><p>No referrals yet</p>
              </div>
            ) : (
              <div className="rounded-md border"><Table><TableHeader><TableRow>
                <TableHead>Name</TableHead><TableHead>Contact</TableHead><TableHead>Code</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead>
              </TableRow></TableHeader>
              <TableBody>{referrals.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell className="text-muted-foreground">{r.email || r.phone || "-"}</TableCell>
                  <TableCell>{r.code ? <Badge variant="outline">{r.code}</Badge> : "-"}</TableCell>
                  <TableCell><Badge variant={r.active ? "default" : "outline"}>{r.active ? "Active" : "Inactive"}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(r.createdAt)}</TableCell>
                </TableRow>
              ))}</TableBody></Table></div>
            )}
          </CardContent>
        </Card>
      </DataState>
    </AppPageScaffold>
  );
}
