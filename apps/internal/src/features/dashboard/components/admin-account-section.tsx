import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components";
import { Eye, EyeOff, Shield, Users } from "lucide-react";
import { internalClinicAdminTypeSchema } from "@workspace/types";
import type { CreateClinicFormData, FieldErrors } from "../hooks/create-clinic-form-helpers";

type Props = {
  formData: CreateClinicFormData;
  fieldErrors: FieldErrors;
  showPassword: boolean;
  onFieldChange: (field: keyof CreateClinicFormData, value: string) => void;
  onTogglePassword: () => void;
};

export function AdminAccountSection({ formData, fieldErrors, showPassword, onFieldChange, onTogglePassword }: Props) {
  return (
    <div className="space-y-4 border-t pt-4">
      <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Admin Account</h4>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="adminName">Admin Name</Label>
          <Input id="adminName" value={formData.adminName} onChange={(e) => { onFieldChange("adminName", e.target.value); }}
            aria-invalid={!!fieldErrors.adminName} />
          {fieldErrors.adminName && <p className="text-sm text-destructive">{fieldErrors.adminName}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="adminEmail">Admin Email</Label>
          <Input id="adminEmail" type="email" value={formData.adminEmail} onChange={(e) => { onFieldChange("adminEmail", e.target.value); }}
            aria-invalid={!!fieldErrors.adminEmail} />
          {fieldErrors.adminEmail && <p className="text-sm text-destructive">{fieldErrors.adminEmail}</p>}
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="adminPassword">Password</Label>
        <div className="relative">
          <Input id="adminPassword" type={showPassword ? "text" : "password"} value={formData.adminPassword}
            onChange={(e) => { onFieldChange("adminPassword", e.target.value); }}
            aria-invalid={!!fieldErrors.adminPassword} />
          <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
            onClick={onTogglePassword}>
            {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
          </Button>
        </div>
        {fieldErrors.adminPassword && <p className="text-sm text-destructive">{fieldErrors.adminPassword}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="adminType">Admin Type *</Label>
        <Select value={formData.adminType} onValueChange={(value) => {
          const parsed = internalClinicAdminTypeSchema.safeParse(value);
          if (!parsed.success) return;
          onFieldChange("adminType", parsed.data);
        }}>
          <SelectTrigger><SelectValue placeholder="Admin type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="admin"><div className="flex items-center gap-2"><Users className="h-4 w-4" /> Clinic Admin</div></SelectItem>
            <SelectItem value="admin_doctor"><div className="flex items-center gap-2"><Shield className="h-4 w-4" /> Admin Doctor</div></SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
