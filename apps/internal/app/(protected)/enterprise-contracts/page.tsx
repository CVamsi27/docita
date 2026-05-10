"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  EnterpriseContractEstimate,
  EnterpriseContractInvoiceRow,
  EnterpriseContractRevisionRow,
  EnterpriseContractRow,
  enterpriseContractsAPI,
  EnterpriseTrueUpAlertRow,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatCurrency, formatDate } from "@workspace/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { PageHeader } from "@workspace/ui/components/page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  AlertTriangle,
  FileText,
  Plus,
  Receipt,
  RefreshCw,
  Users as UsersIcon,
  X,
} from "lucide-react";

type ContractFormState = {
  primaryClinicId: string;
  groupName: string;
  contractNumber: string;
  status: EnterpriseContractRow["status"];
  startDate: string;
  endDate: string;
  billingCycle: EnterpriseContractRow["billingCycle"];
  currency: string;
  platformFeeINR: string;
  includedUsers: string;
  includedConsultations: string;
  includedWhatsappMessages: string;
  includedStorageGB: string;
  includedBranches: string;
  overageUserINR: string;
  overageConsultationINR: string;
  overageWhatsappINR: string;
  overageStorageINR: string;
  annualPrepayDiscountPercent: string;
  trueUpThresholdPercent: string;
  notes: string;
  signedDocumentUrl: string;
  changeSummary: string;
};

const BLANK_FORM: ContractFormState = {
  primaryClinicId: "",
  groupName: "",
  contractNumber: "",
  status: "DRAFT",
  startDate: "",
  endDate: "",
  billingCycle: "MONTHLY",
  currency: "INR",
  platformFeeINR: "",
  includedUsers: "0",
  includedConsultations: "0",
  includedWhatsappMessages: "0",
  includedStorageGB: "0",
  includedBranches: "1",
  overageUserINR: "0",
  overageConsultationINR: "0",
  overageWhatsappINR: "0",
  overageStorageINR: "0",
  annualPrepayDiscountPercent: "0",
  trueUpThresholdPercent: "130",
  notes: "",
  signedDocumentUrl: "",
  changeSummary: "",
};

const QUOTE_PRESETS = {
  MID_ENTERPRISE: {
    label: "Mid-Enterprise (~10 doctors, multi-branch)",
    platformFeeINR: "25000",
    includedUsers: "50",
    includedConsultations: "20000",
    includedWhatsappMessages: "30000",
    includedStorageGB: "250",
    includedBranches: "5",
    overageUserINR: "199",
    overageConsultationINR: "1.5",
    overageWhatsappINR: "0.30",
    overageStorageINR: "0",
  },
  MULTI_SITE: {
    label: "Multi-site (10–30 branches)",
    platformFeeINR: "75000",
    includedUsers: "200",
    includedConsultations: "80000",
    includedWhatsappMessages: "100000",
    includedStorageGB: "750",
    includedBranches: "30",
    overageUserINR: "149",
    overageConsultationINR: "1.25",
    overageWhatsappINR: "0.25",
    overageStorageINR: "0",
  },
  NETWORK: {
    label: "Network/Group (>30 branches)",
    platformFeeINR: "200000",
    includedUsers: "500",
    includedConsultations: "250000",
    includedWhatsappMessages: "300000",
    includedStorageGB: "2000",
    includedBranches: "100",
    overageUserINR: "99",
    overageConsultationINR: "1.0",
    overageWhatsappINR: "0.20",
    overageStorageINR: "0",
  },
} as const;

function inrToCents(inr: string): number {
  const n = Number(inr.trim());
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100);
}

function centsToInr(cents: number): string {
  return (cents / 100).toFixed(2).replace(/\.00$/, "");
}

function rowToForm(row: EnterpriseContractRow): ContractFormState {
  return {
    primaryClinicId: row.primaryClinicId,
    groupName: row.groupName ?? "",
    contractNumber: row.contractNumber,
    status: row.status,
    startDate: row.startDate.slice(0, 10),
    endDate: row.endDate.slice(0, 10),
    billingCycle: row.billingCycle,
    currency: row.currency,
    platformFeeINR: centsToInr(row.platformFeeCents),
    includedUsers: String(row.includedUsers),
    includedConsultations: String(row.includedConsultations),
    includedWhatsappMessages: String(row.includedWhatsappMessages),
    includedStorageGB: String(row.includedStorageGB),
    includedBranches: String(row.includedBranches),
    overageUserINR: centsToInr(row.overageUserCents),
    overageConsultationINR: centsToInr(row.overageConsultationCents),
    overageWhatsappINR: centsToInr(row.overageWhatsappCents),
    overageStorageINR: centsToInr(row.overageStorageCents),
    annualPrepayDiscountPercent: String(row.annualPrepayDiscountPercent),
    trueUpThresholdPercent: String(row.trueUpThresholdPercent),
    notes: row.notes ?? "",
    signedDocumentUrl: row.signedDocumentUrl ?? "",
    changeSummary: "",
  };
}

const statusBadgeClass: Record<EnterpriseContractRow["status"], string> = {
  DRAFT: "badge-muted",
  ACTIVE: "badge-success",
  EXPIRED: "badge-warning",
  TERMINATED: "badge-danger",
};

export default function EnterpriseContractsPage() {
  const { token } = useAuth();
  const [rows, setRows] = useState<EnterpriseContractRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<"create" | "edit">("create");
  const [form, setForm] = useState<ContractFormState>(BLANK_FORM);
  const [editingContractId, setEditingContractId] = useState<string | null>(
    null,
  );

  const [estimateOpen, setEstimateOpen] = useState(false);
  const [estimate, setEstimate] = useState<EnterpriseContractEstimate | null>(
    null,
  );
  const [estimateLoading, setEstimateLoading] = useState(false);

  const [revisionsOpen, setRevisionsOpen] = useState(false);
  const [revisions, setRevisions] = useState<EnterpriseContractRevisionRow[]>(
    [],
  );

  const [membersOpen, setMembersOpen] = useState(false);
  const [activeContract, setActiveContract] =
    useState<EnterpriseContractRow | null>(null);
  const [newMemberClinicId, setNewMemberClinicId] = useState("");

  const [invoicesOpen, setInvoicesOpen] = useState(false);
  const [invoices, setInvoices] = useState<EnterpriseContractInvoiceRow[]>([]);

  const [alertsOpen, setAlertsOpen] = useState(false);
  const [alerts, setAlerts] = useState<EnterpriseTrueUpAlertRow[]>([]);

  const load = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      const list = await enterpriseContractsAPI.list();
      setRows(list);
    } catch {
      setError("We couldn’t load enterprise contracts. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (token) void load();
  }, [token, load]);

  const openCreate = () => {
    setEditorMode("create");
    setEditingContractId(null);
    setForm(BLANK_FORM);
    setEditorOpen(true);
  };

  const openEdit = (row: EnterpriseContractRow) => {
    setEditorMode("edit");
    setEditingContractId(row.id);
    setForm(rowToForm(row));
    setEditorOpen(true);
  };

  const applyPreset = (key: keyof typeof QUOTE_PRESETS) => {
    const p = QUOTE_PRESETS[key];
    setForm((f) => ({ ...f, ...p }));
  };

  const submit = async () => {
    if (
      !form.primaryClinicId ||
      !form.contractNumber ||
      !form.startDate ||
      !form.endDate
    ) {
      setError(
        "primaryClinicId, contractNumber, start and end dates are required",
      );
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await enterpriseContractsAPI.upsert(form.primaryClinicId, {
        contractNumber: form.contractNumber,
        groupName: form.groupName.trim() || null,
        status: form.status,
        startDate: new Date(form.startDate).toISOString(),
        endDate: new Date(form.endDate).toISOString(),
        billingCycle: form.billingCycle,
        currency: form.currency,
        platformFeeCents: inrToCents(form.platformFeeINR),
        includedUsers: Number(form.includedUsers) || 0,
        includedConsultations: Number(form.includedConsultations) || 0,
        includedWhatsappMessages: Number(form.includedWhatsappMessages) || 0,
        includedStorageGB: Number(form.includedStorageGB) || 0,
        includedBranches: Number(form.includedBranches) || 1,
        overageUserCents: inrToCents(form.overageUserINR),
        overageConsultationCents: inrToCents(form.overageConsultationINR),
        overageWhatsappCents: inrToCents(form.overageWhatsappINR),
        overageStorageCents: inrToCents(form.overageStorageINR),
        annualPrepayDiscountPercent:
          Number(form.annualPrepayDiscountPercent) || 0,
        trueUpThresholdPercent: Number(form.trueUpThresholdPercent) || 130,
        notes: form.notes || null,
        signedDocumentUrl: form.signedDocumentUrl || null,
        changeSummary: form.changeSummary || undefined,
      } as Partial<EnterpriseContractRow> & { changeSummary?: string });
      setEditorOpen(false);
      await load();
    } catch {
      setError("We couldn’t save the contract. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const showEstimate = async (contractId: string) => {
    setEstimate(null);
    setEstimateOpen(true);
    setEstimateLoading(true);
    try {
      const est = await enterpriseContractsAPI.estimate(contractId);
      setEstimate(est);
    } catch {
      setError("We couldn’t load the estimate. Please try again.");
    } finally {
      setEstimateLoading(false);
    }
  };

  const showRevisions = async (contractId: string) => {
    setRevisions([]);
    setRevisionsOpen(true);
    try {
      const list = await enterpriseContractsAPI.listRevisions(contractId);
      setRevisions(list);
    } catch {
      setError("We couldn’t load revisions. Please try again.");
    }
  };

  const showMembers = (row: EnterpriseContractRow) => {
    setActiveContract(row);
    setNewMemberClinicId("");
    setMembersOpen(true);
  };

  const addMember = async () => {
    if (!activeContract || !newMemberClinicId.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await enterpriseContractsAPI.addMember(
        activeContract.id,
        newMemberClinicId.trim(),
      );
      setActiveContract(updated);
      setNewMemberClinicId("");
      await load();
    } catch {
      setError("We couldn’t add that clinic. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const removeMember = async (clinicId: string) => {
    if (!activeContract) return;
    if (clinicId === activeContract.primaryClinicId) {
      setError("Cannot remove the primary clinic");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const updated = await enterpriseContractsAPI.removeMember(
        activeContract.id,
        clinicId,
      );
      setActiveContract(updated);
      await load();
    } catch {
      setError("We couldn’t remove that clinic. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const generatePrepay = async (contractId: string) => {
    if (
      !confirm(
        "Generate annual prepay invoice for this contract? This creates a SubscriptionPayment for the 12-month commitment minus any discount.",
      )
    )
      return;
    setBusy(true);
    setError(null);
    try {
      const inv =
        await enterpriseContractsAPI.generateAnnualPrepayInvoice(contractId);
      alert(
        `Prepay invoice generated: ${inv.id}\nAmount: ₹${(inv.amountCents / 100).toFixed(2)}\nDiscount: ${inv.discountPercent}%`,
      );
      await load();
    } catch {
      setError("We couldn’t generate the prepay invoice. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const showInvoices = async (contractId: string) => {
    setInvoices([]);
    setInvoicesOpen(true);
    try {
      const list = await enterpriseContractsAPI.listInvoices(contractId);
      setInvoices(list);
    } catch {
      setError("We couldn’t load invoices. Please try again.");
    }
  };

  const evaluateTrueUp = async (contractId: string) => {
    setBusy(true);
    setError(null);
    try {
      const res = await enterpriseContractsAPI.evaluateTrueUp(contractId);
      alert(
        res.alerted
          ? `True-up alert raised: ${res.observedPercent}% of commit (recipients emailed).`
          : `No alert: usage at ${res.observedPercent}% (below threshold or already alerted this month).`,
      );
      await load();
    } catch {
      setError("We couldn’t evaluate true-up. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const showAlerts = async (contractId: string) => {
    setAlerts([]);
    setAlertsOpen(true);
    try {
      const list = await enterpriseContractsAPI.listTrueUpAlerts(contractId);
      setAlerts(list);
    } catch {
      setError("We couldn’t load alerts. Please try again.");
    }
  };

  const totals = useMemo(() => {
    const active = rows.filter((r) => r.status === "ACTIVE");
    const platformFeeMrr = active.reduce(
      (sum, r) => sum + r.platformFeeCents,
      0,
    );
    return {
      total: rows.length,
      active: active.length,
      draft: rows.filter((r) => r.status === "DRAFT").length,
      mrrCents: platformFeeMrr,
    };
  }, [rows]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Enterprise Contracts"
        description="Per-clinic and multi-clinic group contracts for the ENTERPRISE tier"
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => void load()}
              disabled={refreshing}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              New contract
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total contracts</CardDescription>
            <CardTitle className="text-3xl">{totals.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active</CardDescription>
            <CardTitle className="text-3xl">{totals.active}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Drafts</CardDescription>
            <CardTitle className="text-3xl">{totals.draft}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Platform-fee MRR (active)</CardDescription>
            <CardTitle className="text-3xl">
              {formatCurrency(totals.mrrCents / 100, { currency: "INR" })}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {error && (
        <Card>
          <CardContent className="pt-6 text-sm text-destructive">
            {error}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All enterprise contracts</CardTitle>
          <CardDescription>
            Edit terms, manage member clinics for groups, generate prepay
            invoices, run true-up evaluations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No contracts yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contract # / group</TableHead>
                  <TableHead>Primary clinic</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Platform fee</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="text-xs">
                      <div className="font-mono">{row.contractNumber}</div>
                      {row.groupName && (
                        <div className="text-muted-foreground">
                          {row.groupName}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {row.primaryClinicId}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {row.memberClinicIds.length}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusBadgeClass[row.status]}>
                        {row.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {formatDate(row.startDate)} → {formatDate(row.endDate)}
                    </TableCell>
                    <TableCell>
                      {formatCurrency(row.platformFeeCents / 100, {
                        currency: row.currency,
                      })}
                      <span className="text-xs text-muted-foreground">
                        {" "}
                        / {row.billingCycle.toLowerCase()}
                      </span>
                    </TableCell>
                    <TableCell className="space-x-1 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEdit(row)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => showMembers(row)}
                        title="Members"
                      >
                        <UsersIcon className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void showEstimate(row.id)}
                      >
                        Estimate
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void showInvoices(row.id)}
                        title="Invoices"
                      >
                        <Receipt className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void generatePrepay(row.id)}
                        disabled={row.status !== "ACTIVE" || busy}
                        title="Generate annual prepay invoice"
                      >
                        Prepay
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void evaluateTrueUp(row.id)}
                        disabled={row.status !== "ACTIVE" || busy}
                        title="Evaluate true-up now"
                      >
                        <AlertTriangle className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void showAlerts(row.id)}
                        title="Alert history"
                      >
                        Alerts
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void showRevisions(row.id)}
                        title="Revisions"
                      >
                        <FileText className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {editorMode === "create" ? "New" : "Edit"} enterprise contract
              {editingContractId && (
                <span className="ml-2 font-mono text-xs text-muted-foreground">
                  {editingContractId}
                </span>
              )}
            </DialogTitle>
            <DialogDescription>
              All money fields in {form.currency}. Group contracts: set
              groupName and add member clinics from the Members dialog after
              saving.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <Label>Primary clinic ID</Label>
              <Input
                value={form.primaryClinicId}
                onChange={(e) =>
                  setForm((f) => ({ ...f, primaryClinicId: e.target.value }))
                }
                disabled={editorMode === "edit"}
              />
            </div>
            <div>
              <Label>Group name (optional)</Label>
              <Input
                value={form.groupName}
                placeholder="e.g. Apollo Group"
                onChange={(e) =>
                  setForm((f) => ({ ...f, groupName: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>Contract number</Label>
              <Input
                value={form.contractNumber}
                onChange={(e) =>
                  setForm((f) => ({ ...f, contractNumber: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    status: v as EnterpriseContractRow["status"],
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="EXPIRED">Expired</SelectItem>
                  <SelectItem value="TERMINATED">Terminated</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Billing cycle</Label>
              <Select
                value={form.billingCycle}
                onValueChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    billingCycle: v as EnterpriseContractRow["billingCycle"],
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MONTHLY">Monthly</SelectItem>
                  <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                  <SelectItem value="SEMI_ANNUAL">Semi-annual</SelectItem>
                  <SelectItem value="YEARLY">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Start date</Label>
              <Input
                type="date"
                value={form.startDate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, startDate: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>End date</Label>
              <Input
                type="date"
                value={form.endDate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, endDate: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>Currency</Label>
              <Input
                value={form.currency}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    currency: e.target.value.toUpperCase(),
                  }))
                }
              />
            </div>
            <div>
              <Label>Platform fee ({form.currency})</Label>
              <Input
                value={form.platformFeeINR}
                onChange={(e) =>
                  setForm((f) => ({ ...f, platformFeeINR: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="rounded-md border p-3">
            <p className="mb-2 text-sm font-medium">Quote presets</p>
            <div className="flex flex-wrap gap-2">
              {(
                Object.keys(QUOTE_PRESETS) as Array<keyof typeof QUOTE_PRESETS>
              ).map((k) => (
                <Button
                  key={k}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => applyPreset(k)}
                >
                  {QUOTE_PRESETS[k].label}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div>
              <Label>Inc. users</Label>
              <Input
                value={form.includedUsers}
                onChange={(e) =>
                  setForm((f) => ({ ...f, includedUsers: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>Inc. consultations</Label>
              <Input
                value={form.includedConsultations}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    includedConsultations: e.target.value,
                  }))
                }
              />
            </div>
            <div>
              <Label>Inc. WhatsApp msgs</Label>
              <Input
                value={form.includedWhatsappMessages}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    includedWhatsappMessages: e.target.value,
                  }))
                }
              />
            </div>
            <div>
              <Label>Inc. storage GB</Label>
              <Input
                value={form.includedStorageGB}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    includedStorageGB: e.target.value,
                  }))
                }
              />
            </div>
            <div>
              <Label>Inc. branches</Label>
              <Input
                value={form.includedBranches}
                onChange={(e) =>
                  setForm((f) => ({ ...f, includedBranches: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>Overage / user</Label>
              <Input
                value={form.overageUserINR}
                onChange={(e) =>
                  setForm((f) => ({ ...f, overageUserINR: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>Overage / consult</Label>
              <Input
                value={form.overageConsultationINR}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    overageConsultationINR: e.target.value,
                  }))
                }
              />
            </div>
            <div>
              <Label>Overage / WA msg</Label>
              <Input
                value={form.overageWhatsappINR}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    overageWhatsappINR: e.target.value,
                  }))
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Annual prepay discount %</Label>
              <Input
                value={form.annualPrepayDiscountPercent}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    annualPrepayDiscountPercent: e.target.value,
                  }))
                }
              />
            </div>
            <div>
              <Label>True-up threshold %</Label>
              <Input
                value={form.trueUpThresholdPercent}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    trueUpThresholdPercent: e.target.value,
                  }))
                }
              />
            </div>
          </div>

          <div>
            <Label>Signed document URL</Label>
            <Input
              value={form.signedDocumentUrl}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  signedDocumentUrl: e.target.value,
                }))
              }
            />
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea
              value={form.notes}
              onChange={(e) =>
                setForm((f) => ({ ...f, notes: e.target.value }))
              }
            />
          </div>

          <div>
            <Label>Change summary (revision log)</Label>
            <Input
              value={form.changeSummary}
              placeholder="Why this change?"
              onChange={(e) =>
                setForm((f) => ({ ...f, changeSummary: e.target.value }))
              }
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditorOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void submit()} disabled={busy}>
              {busy ? "Saving…" : editorMode === "create" ? "Create" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={membersOpen} onOpenChange={setMembersOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Member clinics</DialogTitle>
            <DialogDescription>
              {activeContract?.contractNumber} ·{" "}
              {activeContract?.groupName ?? "no group name"}
            </DialogDescription>
          </DialogHeader>
          {activeContract && (
            <div className="space-y-3 text-sm">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Clinic ID</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeContract.memberClinicIds.map((cid) => (
                    <TableRow key={cid}>
                      <TableCell className="font-mono text-xs">
                        {cid}
                        {cid === activeContract.primaryClinicId && (
                          <Badge className="ml-2" variant="outline">
                            primary
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void removeMember(cid)}
                          disabled={
                            busy || cid === activeContract.primaryClinicId
                          }
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex items-end gap-2 border-t pt-3">
                <div className="flex-1">
                  <Label>Add clinic ID</Label>
                  <Input
                    value={newMemberClinicId}
                    onChange={(e) => setNewMemberClinicId(e.target.value)}
                    placeholder="cli_…"
                  />
                </div>
                <Button onClick={() => void addMember()} disabled={busy}>
                  Add
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={estimateOpen} onOpenChange={setEstimateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Current period estimate</DialogTitle>
            <DialogDescription>
              Live meter readings + projected month-end invoice (aggregated
              across all member clinics).
            </DialogDescription>
          </DialogHeader>
          {estimateLoading || !estimate ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <div className="space-y-3 text-sm">
              <p>
                Period:{" "}
                <strong>
                  {formatDate(estimate.period.start)} →{" "}
                  {formatDate(estimate.period.end)}
                </strong>
              </p>
              <p className="text-xs text-muted-foreground">
                {estimate.contract.memberClinicIds.length} member clinic(s)
              </p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Meter</TableHead>
                    <TableHead className="text-right">Used</TableHead>
                    <TableHead className="text-right">Included</TableHead>
                    <TableHead className="text-right">Overage</TableHead>
                    <TableHead className="text-right">Charge</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(estimate.meters).map(([k, m]) => (
                    <TableRow key={k}>
                      <TableCell>{k}</TableCell>
                      <TableCell className="text-right">{m.current}</TableCell>
                      <TableCell className="text-right">{m.included}</TableCell>
                      <TableCell className="text-right">{m.overage}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(m.chargeCents / 100, {
                          currency: estimate.currency,
                        })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex justify-between border-t pt-2">
                <span>Platform fee</span>
                <strong>
                  {formatCurrency(estimate.platformFeeCents / 100, {
                    currency: estimate.currency,
                  })}
                </strong>
              </div>
              <div className="flex justify-between">
                <span>Overage total</span>
                <strong>
                  {formatCurrency(estimate.overageTotalCents / 100, {
                    currency: estimate.currency,
                  })}
                </strong>
              </div>
              <div className="flex justify-between text-base">
                <span>Projected month total</span>
                <strong>
                  {formatCurrency(estimate.projectedMonthTotalCents / 100, {
                    currency: estimate.currency,
                  })}
                </strong>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={invoicesOpen} onOpenChange={setInvoicesOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enterprise invoices</DialogTitle>
            <DialogDescription>
              Annual prepay and ad-hoc adjustments tracked separately from
              monthly overage invoices.
            </DialogDescription>
          </DialogHeader>
          {invoices.length === 0 ? (
            <p className="text-sm text-muted-foreground">No invoices yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kind</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell>{inv.kind}</TableCell>
                    <TableCell className="text-xs">
                      {formatDate(inv.periodStart)} →{" "}
                      {formatDate(inv.periodEnd)}
                    </TableCell>
                    <TableCell>
                      {formatCurrency(inv.amountCents / 100, {
                        currency: inv.currency,
                      })}
                    </TableCell>
                    <TableCell>{inv.discountPercent}%</TableCell>
                    <TableCell>
                      {inv.subscriptionPayment?.status ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={alertsOpen} onOpenChange={setAlertsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>True-up alerts</DialogTitle>
            <DialogDescription>
              Daily cron (03:15 UTC) raises one alert per contract per calendar
              month when YTD spend ≥ threshold% of YTD platform commit.
            </DialogDescription>
          </DialogHeader>
          {alerts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No alerts yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Observed %</TableHead>
                  <TableHead>Threshold %</TableHead>
                  <TableHead>YTD overage</TableHead>
                  <TableHead>Recipients</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alerts.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="text-xs">
                      {formatDate(a.alertedAt)}
                    </TableCell>
                    <TableCell>
                      <strong>{a.observedPercent}%</strong>
                    </TableCell>
                    <TableCell>{a.thresholdPercent}%</TableCell>
                    <TableCell>
                      ₹{(a.ytdOverageCents / 100).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-xs">
                      {a.recipients.join(", ") || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={revisionsOpen} onOpenChange={setRevisionsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revision history</DialogTitle>
          </DialogHeader>
          {revisions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No revisions yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Effective</TableHead>
                  <TableHead>Summary</TableHead>
                  <TableHead>By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {revisions.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs">
                      {formatDate(r.effectiveDate)}
                    </TableCell>
                    <TableCell className="text-xs">{r.changeSummary}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {r.createdById ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
