import { useState, useMemo } from "react";
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
  ConfirmationDialog,
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
  Ban,
  MessageSquareText,
  Pencil,
  Plus,
  RefreshCw,
  TrendingUp,
  Users,
} from "lucide-react";
import { formatDateTime, enIN } from "@workspace/utils";
import { apiPatch, apiPost } from "@/lib/api/api-client";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import type { Referral } from "../types";
import { ReferrerFormDialog } from "../components/referrer-form-dialog";
import { ReferrerMessagesDialog } from "../components/referrer-messages-dialog"
import { useApiQuery } from "@/hooks/use-api-query";

/** Real contract for GET /api/v1/internal/referral-payouts/summary. */
interface PayoutSummaryRow {
  status: string;
  count: number;
  totalCents: number;
}

export function ReferralsPage() {
  const { data: referrals = [], isLoading, refetch } = useApiQuery<Referral[]>("/api/internal/referrers");
  const { data: payoutData = [] } = useApiQuery<PayoutSummaryRow[]>("/api/internal/referral-payouts/summary");

  const stats = useMemo(() => ({
    total: referrals.length,
    converted: referrals.filter((r) => r.active).length,
    commission: payoutData.reduce((sum, row) => sum + row.totalCents, 0) / 100,
  }), [referrals, payoutData]);

  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [formReferrer, setFormReferrer] = useState<Referral | null>(null);
  const [deactivating, setDeactivating] = useState<Referral | null>(null);
  const [messagesFor, setMessagesFor] = useState<Referral | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);

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

  const handleDeactivate = async (referral: Referral) => {
    setDeactivatingId(referral.id);
    try {
      await apiPatch(`/api/internal/referrers/${referral.id}/deactivate`);
      toast.success(`${referral.name} has been deactivated`);
      void refetch();
    } catch (error) {
      showUserFacingErrorToast(
        error,
        "We could not deactivate this partner right now. Please try again.",
      );
    } finally {
      setDeactivatingId(null);
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
            <Button
              onClick={() => {
                setFormReferrer(null);
                setFormDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" /> Create Partner
            </Button>
          }
        />
      }
    >
      <DataState
        status={isLoading ? "loading" : "success"}
        loadingMessage="Loading referrals..."
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
                          {formatDateTime(r.createdAt, undefined, { locale: enIN })}
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
                              onClick={() => {
                                setFormReferrer(r);
                                setFormDialogOpen(true);
                              }}
                            >
                              <Pencil className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeactivating(r)}
                              disabled={!r.active || deactivatingId === r.id}
                            >
                              <Ban
                                className={`h-4 w-4 mr-1 ${
                                  deactivatingId === r.id ? "animate-spin" : ""
                                }`}
                              />
                              {deactivatingId === r.id
                                ? "Deactivating…"
                                : r.active
                                  ? "Deactivate"
                                  : "Deactivated"}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => void handleResendWelcome(r)}
                              // The welcome pipeline skips inactive partners
                              // silently and the API now rejects the resend,
                              // so the action must not be offered.
                              disabled={!r.active || resendingId === r.id}
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

      <ReferrerFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        referrer={formReferrer}
        onSaved={() => void refetch()}
      />
      <ConfirmationDialog
        open={deactivating !== null}
        onOpenChange={(open) => {
          if (!open) setDeactivating(null);
        }}
        title="Deactivate partner?"
        description="This partner will not be able to sign in, share their code, or accrue new commissions. Existing ledger rows are preserved."
        confirmText="Deactivate"
        cancelText="Cancel"
        type="danger"
        onConfirm={() => {
          const target = deactivating;
          setDeactivating(null);
          if (target) void handleDeactivate(target);
        }}
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
