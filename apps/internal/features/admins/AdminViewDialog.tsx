"use client";

import { Shield } from "lucide-react";
import { Badge } from "@workspace/ui/components/indicators/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/overlay/dialog";
import { Label } from "@workspace/ui/components/form/label";
import { formatInternalTimestamp } from "@/lib/formatters/format-display-date";
import type { Admin } from "./use-admins-page";

interface AdminViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  admin: Admin | null;
  getRoleLabel: (role: string) => string;
  getRoleBadgeVariant: (role: string) => "default" | "outline";
}

export function AdminViewDialog({
  open,
  onOpenChange,
  admin,
  getRoleLabel,
  getRoleBadgeVariant,
}: AdminViewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {admin?.name}
          </DialogTitle>
          <DialogDescription>Admin details and information</DialogDescription>
        </DialogHeader>
        {admin && (
          <div className="space-y-4">
            <div>
              <Label className="text-muted-foreground">Name</Label>
              <p className="font-medium">{admin.name}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Email</Label>
              <p className="font-medium">{admin.email}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Phone</Label>
              <p className="font-medium">{admin.phoneNumber || "-"}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Type</Label>
              <p className="font-medium">
                <Badge variant={getRoleBadgeVariant(admin.role)}>
                  {getRoleLabel(admin.role)}
                </Badge>
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">Created</Label>
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
