import { useState, useEffect, useMemo } from "react";
import { AppPageScaffold, ConfirmationDialog, DataState, Input, PageHeader } from "@workspace/ui/components";
import { Plus } from "lucide-react";
import { Button } from "@workspace/ui/components/form/button";
import { AdminsTable } from "../components/admins-table";
import { AdminCreateDialog, AdminEditDialog, AdminViewDialog } from "../components/admins-dialogs";
import { apiGet, apiPost, apiPatch } from "@/lib/api/api-client";

interface Admin { id: string; name: string; email: string; phoneNumber?: string; role: string; appLoginDisabled: boolean; createdAt: string; }

const LABELS: Record<string, string> = { admin: "Clinic Admin", admin_doctor: "Admin Doctor", ADMIN: "Clinic Admin", ADMIN_DOCTOR: "Admin Doctor" };
const BADGE: Record<string, "default" | "outline"> = { admin: "outline", admin_doctor: "default", ADMIN: "outline", ADMIN_DOCTOR: "default" };
const getRoleLabel = (r: string): string => LABELS[r] ?? r;
const getRoleBadgeV = (r: string): "default" | "outline" => BADGE[r] ?? "outline";

export function AdminsPage() {
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [search, setSearch] = useState("");
  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [deactivatingAdmin, setDeactivatingAdmin] = useState<Admin | null>(null);
  const [createForm, setCreateForm] = useState({ name: "", email: "", password: "", phoneNumber: "", adminType: "admin" });
  const [editForm, setEditForm] = useState({ name: "", email: "", phoneNumber: "", adminType: "admin" });
  const [saving, setSaving] = useState(false);

  // The API exposes only clinic-scoped admin routes (clinics/:id/admins)
  // and admins/:id mutations, not an all-admins list; surface an explicit
  // error state instead of a silently empty table.
  const fetchAdmins = async () => {
    setLoading(true);
    setHasError(false);
    try {
      const data = await apiGet<Admin[]>("/api/internal/admins");
      setAdmins(data);
    } catch { setHasError(true); }
    finally { setLoading(false); }
  };

  useEffect(() => { void fetchAdmins(); }, []);

  const filteredAdmins = useMemo(() =>
    admins.filter((a) => a.name.toLowerCase().includes(search.toLowerCase()) || a.email.toLowerCase().includes(search.toLowerCase())),
    [admins, search]);

  const handleCreate = async () => {
    setSaving(true);
    try {
      await apiPost("/api/internal/clinics/admins", createForm);
      setIsCreateOpen(false);
      setCreateForm({ name: "", email: "", password: "", phoneNumber: "", adminType: "admin" });
      await fetchAdmins();
    } catch { /* ignore */ }
    finally { setSaving(false); }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiPatch(`/api/internal/admins/${String(selectedAdmin?.id)}`, editForm);
      setIsEditOpen(false);
      await fetchAdmins();
    } catch { /* ignore */ }
    finally { setSaving(false); }
  };

  const handleDeactivate = async (adminId: string) => {
    try {
      await apiPatch(`/api/internal/admins/${adminId}/deactivate`);
      await fetchAdmins();
    } catch { /* ignore */ }
  };

  const handleActivate = async (adminId: string) => {
    try {
      await apiPatch(`/api/internal/admins/${adminId}/activate`);
      await fetchAdmins();
    } catch { /* ignore */ }
  };

  return (
    <AppPageScaffold header={<PageHeader title="Admins" description="Manage clinic administrators and admin doctors" size="compact" />}>
      <DataState status={loading ? "loading" : hasError ? "error" : "success"} loadingMessage="Loading admins\u2026"
        errorMessage="We could not load admin records. The internal admins list endpoint is not available yet."
        onRetry={() => { void fetchAdmins(); }}>
        <div className="mb-4 flex items-center gap-4">
          <Input className="max-w-sm" placeholder="Enter name or email" value={search} onChange={(e) => { setSearch(e.target.value); }} />
          <Button onClick={() => { setIsCreateOpen(true); }}><Plus className="h-4 w-4 mr-2" /> Add Admin</Button>
        </div>
        <AdminsTable admins={filteredAdmins} selectedClinic="all" onView={(a) => { setSelectedAdmin(a); setIsViewOpen(true); }}
          onEdit={(a) => { setSelectedAdmin(a); setEditForm({ name: a.name, email: a.email, phoneNumber: a.phoneNumber || "", adminType: a.role === "ADMIN_DOCTOR" ? "admin_doctor" : "admin" }); setIsEditOpen(true); }}
          onDeactivate={(a) => { setDeactivatingAdmin(a); }} onActivate={(id) => { void handleActivate(id); }} getRoleLabel={getRoleLabel} getRoleBadgeVariant={getRoleBadgeV} />
      </DataState>
      <ConfirmationDialog open={!!deactivatingAdmin} onOpenChange={(o) => { if (!o) setDeactivatingAdmin(null); }}
        title="Deactivate admin?" description="This admin will not be able to sign in until re-enabled."
        confirmText="Deactivate" cancelText="Cancel" type="danger"
        onConfirm={() => { const id = deactivatingAdmin?.id; setDeactivatingAdmin(null); if (id) { void handleDeactivate(id); } }} />
      <AdminViewDialog open={isViewOpen} onOpenChange={setIsViewOpen} admin={selectedAdmin} getRoleLabel={getRoleLabel} getRoleBadgeVariant={getRoleBadgeV} />
      <AdminCreateDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} form={createForm} onFormChange={setCreateForm}          onCreate={() => { void handleCreate(); }} saving={saving} />
      <AdminEditDialog open={isEditOpen} onOpenChange={setIsEditOpen} form={editForm} onFormChange={setEditForm} onSave={() => { void handleSave(); }} saving={saving} />
    </AppPageScaffold>
  );
}
