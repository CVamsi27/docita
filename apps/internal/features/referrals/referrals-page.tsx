"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  type CreateInternalReferrerInput,
  type ReferrerType,
  useInternalReferralPayouts,
  useInternalReferralPayoutSummary,
  useInternalReferrers,
} from "@workspace/data-access/internal";
import { internalQueryKeys } from "@workspace/data-access";
import { useAuth } from "@/lib/auth/auth";
import { client } from "@/lib/api/api-client";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import { Button } from "@workspace/ui/components/form/button";
import { Input } from "@workspace/ui/components/form/input";
import { Badge } from "@workspace/ui/components/indicators/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/data-display/table";

const REFERRER_TYPES: ReferrerType[] = [
  "MARKETING_PERSON",
  "PHARMACY",
  "CLINIC",
  "CUSTOM",
];

function rupees(cents: number): string {
  return `₹${(cents / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function ReferralsPage() {
  const { token, isInternal } = useAuth();
  const enabled = Boolean(isInternal && token);
  const queryClient = useQueryClient();

  const referrers = useInternalReferrers(token, { enabled });
  const payouts = useInternalReferralPayouts(token, "", { enabled });
  const summary = useInternalReferralPayoutSummary(token, { enabled });

  const [form, setForm] = useState<CreateInternalReferrerInput>({
    type: "MARKETING_PERSON",
    name: "",
    email: "",
    phone: "",
  });

  const createReferrer = useMutation({
    mutationFn: (input: CreateInternalReferrerInput) =>
      client.post("/internal/referrers", input),
    onSuccess: () => {
      toast.success("Referrer created");
      setForm({ type: "MARKETING_PERSON", name: "", email: "", phone: "" });
      void queryClient.invalidateQueries({
        queryKey: internalQueryKeys.internal.referrers(),
      });
    },
    onError: (error) =>
      showUserFacingErrorToast(error, "Could not create referrer", "generic"),
  });

  const markPaid = useMutation({
    mutationFn: (payoutId: string) =>
      client.post(`/internal/referral-payouts/${payoutId}/mark-paid`, {}),
    onSuccess: () => {
      toast.success("Payout marked paid");
      void queryClient.invalidateQueries({
        queryKey: internalQueryKeys.internal.referralPayoutsRoot(),
      });
    },
    onError: (error) =>
      showUserFacingErrorToast(error, "Could not mark payout paid", "generic"),
  });

  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Referrals</h1>
        <p className="text-sm text-muted-foreground">
          Referral partners and the revenue-share payout ledger. Payouts are
          disbursed manually — mark a row paid once you have sent the money.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Payout summary</h2>
        <div className="flex flex-wrap gap-3">
          {(summary.data ?? []).map((row) => (
            <div
              key={row.status}
              className="rounded-lg border px-4 py-3 text-sm"
            >
              <div className="text-muted-foreground">{row.status}</div>
              <div className="text-lg font-semibold">{rupees(row.totalCents)}</div>
              <div className="text-xs text-muted-foreground">
                {row.count} payout(s)
              </div>
            </div>
          ))}
          {summary.data && summary.data.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payouts yet.</p>
          ) : null}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Add referrer</h2>
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (!form.name.trim()) {
              toast.error("Name is required");
              return;
            }
            createReferrer.mutate({
              ...form,
              email: form.email || undefined,
              phone: form.phone || undefined,
            });
          }}
        >
          <label className="text-sm">
            <span className="mb-1 block text-muted-foreground">Type</span>
            <select
              className="h-9 rounded-md border bg-background px-2 text-sm"
              value={form.type}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  type: event.target.value as ReferrerType,
                }))
              }
            >
              {REFERRER_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-muted-foreground">Name</span>
            <Input
              value={form.name}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, name: event.target.value }))
              }
              placeholder="Partner name"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-muted-foreground">Email</span>
            <Input
              value={form.email ?? ""}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, email: event.target.value }))
              }
              placeholder="optional"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-muted-foreground">Phone</span>
            <Input
              value={form.phone ?? ""}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, phone: event.target.value }))
              }
              placeholder="optional"
            />
          </label>
          <Button type="submit" disabled={createReferrer.isPending}>
            {createReferrer.isPending ? "Saving…" : "Add"}
          </Button>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Referrers</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Reward</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Active</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(referrers.data ?? []).map((referrer) => (
              <TableRow key={referrer.id}>
                <TableCell>{referrer.name}</TableCell>
                <TableCell>{referrer.type}</TableCell>
                <TableCell>{referrer.rewardKind}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {referrer.email ?? referrer.phone ?? "—"}
                </TableCell>
                <TableCell>
                  <Badge variant={referrer.active ? "default" : "secondary"}>
                    {referrer.active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Payout ledger</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Period start</TableHead>
              <TableHead>Base revenue</TableHead>
              <TableHead>Rate</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {(payouts.data ?? []).map((payout) => (
              <TableRow key={payout.id}>
                <TableCell className="text-xs">
                  {payout.periodStart.slice(0, 10)}
                </TableCell>
                <TableCell>{rupees(payout.baseRevenueCents)}</TableCell>
                <TableCell>{payout.ratePercent}%</TableCell>
                <TableCell className="font-medium">
                  {rupees(payout.amountCents)}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={payout.status === "PAID" ? "default" : "secondary"}
                  >
                    {payout.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {payout.status === "PENDING" ||
                  payout.status === "APPROVED" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={markPaid.isPending}
                      onClick={() => markPaid.mutate(payout.id)}
                    >
                      Mark paid
                    </Button>
                  ) : null}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>
    </div>
  );
}
