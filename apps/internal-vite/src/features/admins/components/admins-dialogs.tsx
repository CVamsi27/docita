import { Shield, Plus, Edit2 } from "lucide-react";
import { Badge } from "@workspace/ui/components/indicators/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@workspace/ui/components/overlay/dialog";
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components";
import { internalClinicAdminTypeSchema } from "@workspace/types";
import { formatInternalTimestamp } from "../../../lib/formatters";

interface Admin { id: string; name: string; email: string; phoneNumber?: string; role: string; appLoginDisabled: boolean; createdAt: string; }

export function AdminViewDialog({ open, onOpenChange, admin, getRoleLabel, getRoleBadgeVariant }:
  { open: boolean; onOpenChange: (o: boolean) => void; admin: Admin | null; getRoleLabel: (r: string) => string; getRoleBadgeVariant: (r: string) => "default" | "outline" }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Shield className="h-5 w-5" /> {admin?.name}</DialogTitle>
          <DialogDescription>Admin profile details</DialogDescription></DialogHeader>
        {admin && <div className="space-y-4">
          <div><Label className="text-muted-foreground">Name</Label><p className="font-medium">{admin.name}</p></div>
          <div><Label className="text-muted-foreground">Email</Label><p className="font-medium">{admin.email}</p></div>
          <div><Label className="text-muted-foreground">Phone</Label><p className="font-medium">{admin.phoneNumber || "-"}</p></div>
          <div><Label className="text-muted-foreground">Type</Label><p><Badge variant={getRoleBadgeVariant(admin.role)}>{getRoleLabel(admin.role)}</Badge></p></div>
          <div><Label className="text-muted-foreground">Created</Label><p className="font-medium">{formatInternalTimestamp(admin.createdAt)}</p></div>
        </div>}
      </DialogContent>
    </Dialog>
  );
}

interface CreateForm { clinicId: string; name: string; email: string; password: string; phoneNumber: string; adminType: string; }
interface EditForm { name: string; email: string; phoneNumber: string; adminType: string; }

function ClinicSelectField({ form, onFormChange, clinics }: { form: CreateForm; onFormChange: (f: CreateForm) => void; clinics: { id: string; name: string }[] }) {
  return (
    <div className="space-y-2"><Label>Clinic *</Label>
      <Select value={form.clinicId || undefined} onValueChange={(v) => { onFormChange({ ...form, clinicId: v }); }}>
        <SelectTrigger><SelectValue placeholder="Select clinic" /></SelectTrigger>
        <SelectContent>{clinics.map((clinic) => (
          <SelectItem key={clinic.id} value={clinic.id}>{clinic.name}</SelectItem>
        ))}</SelectContent>
      </Select>
    </div>
  );
}

function AdminFormFields<T extends CreateForm | EditForm>({ form, onFormChange, showPassword }: { form: T; onFormChange: (f: T) => void; showPassword?: boolean }) {
  return (
    <>
      <div className="space-y-2"><Label>Name *</Label><Input value={form.name} onChange={(e) => { onFormChange({ ...form, name: e.target.value }); }} placeholder="Admin name" /></div>
      <div className="space-y-2"><Label>Email *</Label><Input type="email" value={form.email} onChange={(e) => { onFormChange({ ...form, email: e.target.value }); }} placeholder="Email" /></div>
      {showPassword && (<div className="space-y-2"><Label>Password *</Label><Input type="password" value={""} onChange={(e) => { onFormChange({ ...form, password: e.target.value }); }} placeholder="Password" /></div>)}
      <div className="space-y-2"><Label>Phone</Label><Input type="tel" value={form.phoneNumber} onChange={(e) => { onFormChange({ ...form, phoneNumber: e.target.value }); }} placeholder="Phone number" /></div>
      <div className="space-y-2"><Label>Admin Type *</Label>
        <Select value={form.adminType} onValueChange={(v) => {
          const p = internalClinicAdminTypeSchema.safeParse(v);
          if (p.success) { onFormChange({ ...form, adminType: p.data }); }
        }}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="admin">Clinic Admin</SelectItem><SelectItem value="admin_doctor">Admin Doctor</SelectItem></SelectContent>
        </Select>
      </div>
    </>
  );
}

export function AdminCreateDialog({ open, onOpenChange, form, onFormChange, clinics, onCreate, saving }:
  { open: boolean; onOpenChange: (o: boolean) => void; form: CreateForm; onFormChange: (f: CreateForm) => void; clinics: { id: string; name: string }[]; onCreate: () => void; saving: boolean }) {
  const handleClose = () => { onOpenChange(false); };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Plus className="h-5 w-5" /> Create New Admin</DialogTitle>
          <DialogDescription>Add a new administrator to a clinic</DialogDescription></DialogHeader>
        <div className="space-y-4">
          <ClinicSelectField form={form} onFormChange={onFormChange} clinics={clinics} />
          <AdminFormFields form={form} onFormChange={onFormChange} showPassword />
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={handleClose}>Cancel</Button>
            <Button onClick={onCreate} disabled={saving}>{saving ? "Creating\u2026" : "Create Admin"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function AdminEditDialog({ open, onOpenChange, form, onFormChange, onSave, saving }:
  { open: boolean; onOpenChange: (o: boolean) => void; form: EditForm; onFormChange: (f: EditForm) => void; onSave: () => void; saving: boolean }) {
  const handleClose = () => { onOpenChange(false); };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Edit2 className="h-5 w-5" /> Edit Admin</DialogTitle>
          <DialogDescription>Update admin information</DialogDescription></DialogHeader>
        <div className="space-y-4">
          <AdminFormFields form={form} onFormChange={onFormChange} />
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={handleClose}>Cancel</Button>
            <Button onClick={onSave} disabled={saving}>{saving ? "Saving\u2026" : "Save Changes"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
