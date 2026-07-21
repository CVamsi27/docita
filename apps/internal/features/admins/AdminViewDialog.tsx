"use client";

import { Shield } from "lucide-react";
import {
  Badge,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Label
} from "@workspace/ui/components";
import { useTranslations } from "next-intl";
import { formatInternalTimestamp } from "@/lib/formatters/format-internal-timestamp";
import type { Admin } from "./use-admins-page";

interface AdminViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  admin: Admin | null;
  getRoleLabel: (role: string) => string;
  getRoleBadgeVariant: (role: string) => "default" | "outline";
}

/**
 * Phase 3 (per-feature): apps/internal Admins > View dialog
 * (read-only admin profile view). 6 literals converted to
 * useTranslations("InternalAdmins.viewDialog").
 */
function useAdminViewTranslations() {
  return useTranslations("InternalAdmins.viewDialog");
}

export function AdminViewDialog({
  open,
  onOpenChange,
  admin,
  getRoleLabel,
  getRoleBadgeVariant,
}: AdminViewDialogProps) {
  const t = useAdminViewTranslations();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {admin?.name}
          </DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        {admin && (
          <div className="space-y-4">
            <div>
              <Label className="text-muted-foreground">{t("nameLabel")}</Label>
              <p className="font-medium">{admin.name}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">{t("emailLabel")}</Label>
              <p className="font-medium">{admin.email}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">{t("phoneLabel")}</Label>
              <p className="font-medium">{admin.phoneNumber || "-"}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">{t("typeLabel")}</Label>
              <p className="font-medium">
                <Badge variant={getRoleBadgeVariant(admin.role)}>
                  {getRoleLabel(admin.role)}
                </Badge>
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">{t("createdLabel")}</Label>
              <p className="font-medium">
                {formatInternalTimestamp(admin.createdAt)}
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
