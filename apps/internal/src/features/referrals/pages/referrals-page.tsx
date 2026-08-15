import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  AppPageScaffold,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DataState,
  PageHeader,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components";
import {
  ArrowLeftRight,
  MessageSquareText,
  Plus,
  RefreshCw,
  TrendingUp,
  Users,
} from "lucide-react";
import { formatDate } from "../../../lib/formatters";
import { apiGet, apiPost } from "@/lib/api/api-client";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import { CreateReferrerDialog } from "../components/create-referrer-dialog";
import { ReferrerMessagesDialog } from "../components/referrer-messages-dialog";

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
interface PayoutSummaryRow {
  status: string;
  count: number;
  totalCents: number;
}

export function ReferralsPage() {
  const [loading, setLoading] = useState(true);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [stats, setStats] = useState({ total: 0, converted: 0, commission: 0 });
  const [createOpen, setCreateOpen] = useState(false);
  const [messagesFor, setMessagesFor] = useState<Referral | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);

  const fetchReferrals = useCallback(async () => {
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
        commission:
          payoutData.reduce((sum, row) => sum + row.totalCents, 0) / 100,
      });
    } catch {
      /* keep last-known data; the DataState below only renders when loading */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchReferrals();
  }, [fetchReferrals]);

  const handleResendWelcome = async (referral: Referral) => {
    setResendingId(referral.id);
    try {
      await apiPost(`/api/internal/referrers/${referral.id}/resend-welcome`);
      toast.success(`Welcome message queued for ${referral.name}`);
    } catch (error) {
      showUserFacingErrorToast(
        error,
        "We could not resend the welcome message right now. Please try again.",
      );
    } finally {
      setResendingId(null);
    }
  };

  return (
    <AppPageScaffold
      header={
        <PageHeader
          title="Referrals"
          description="Track referral partners, conversions, and commissions"
          size="compact"
          actions={
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" /> Create Partner
            </Button>
          }
        />
      }
    >
      <DataState
        status={loading ? "loading" : "success"}
        loadingMessage="Loading referrals…"
      >
        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Referrals
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold tabular-nums">
                {stats.total}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold tabular-nums">
                {stats.converted}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Commission Paid
              </CardTitle>
              <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold tabular-nums">
                ₹{stats.commission.toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Referrals</CardTitle>
            <CardDescription>
              {referrals.length} referral record(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {referrals.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                <Users className="h-10 w-10 mb-4" />
                <p>No referrals yet</p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {referrals.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.name}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {r.email || r.phone || "-"}
                        </TableCell>
                        <TableCell>
                          {r.code ? (
                            <Badge variant="outline">{r.code}</Badge>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={r.active ? "default" : "outline"}>
                            {r.active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(r.createdAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setMessagesFor(r)}
                            >
                              <MessageSquareText className="h-4 w-4 mr-1" />
                              Messages
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => void handleResendWelcome(r)}
                              disabled={resendingId === r.id}
                            >
                              <RefreshCw
                                className={`h-4 w-4 mr-1 ${
                                  resendingId === r.id ? "animate-spin" : ""
                                }`}
                              />
                              {resendingId === r.id
                                ? "Sending…"
                                : "Resend welcome"}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </DataState>

      <CreateReferrerDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => void fetchReferrals()}
      />
      <ReferrerMessagesDialog
        open={messagesFor !== null}
        onOpenChange={(open) => {
          if (!open) setMessagesFor(null);
        }}
        referrerId={messagesFor?.id ?? null}
        referrerName={messagesFor?.name ?? ""}
      />
    </AppPageScaffold>
  );
}
