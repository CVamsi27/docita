"use client";

import { useState } from "react";
import { CRUDDialog } from "@workspace/ui/components/crud-dialog.js";
import { Input } from "@workspace/ui/components/input.js";
import { Label } from "@workspace/ui/components/label.js";
import { Pencil } from "lucide-react";
import { Button } from "@workspace/ui/components/button.js";
import { DialogTrigger } from "@workspace/ui/components/dialog.js";
import { API_URL } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { toast } from "sonner";
import { TIER_INFO, type TierName } from "@workspace/types";

// Available tiers for clinic editing (excluding INTELLIGENCE which is an add-on)
const AVAILABLE_TIERS: TierName[] = [
  "CAPTURE",
  "CORE",
  "PLUS",
  "PRO",
  "ENTERPRISE",
];

// Helper to normalize legacy tier names to new tier names
function normalizeTierName(tier: string): TierName {
  const legacyMapping: Record<string, TierName> = {
    FREE: "CAPTURE",
    STARTER: "CORE",
    PROFESSIONAL: "PRO",
  };
  return (legacyMapping[tier] || tier) as TierName;
}

function getInitialFormData(clinic: Clinic | null) {
  if (!clinic) {
    return {
      name: "",
      email: "",
      phone: "",
      address: "",
      tier: "CAPTURE",
      active: true,
    };
  }
  return {
    name: clinic.name,
    email: clinic.email,
    phone: clinic.phone,
    address: clinic.address,
    tier: normalizeTierName(clinic.tier),
    active: clinic.active,
  };
}

interface Clinic {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  tier: string;
  active: boolean;
}

export function EditClinicDialog({
  clinic,
  onClinicUpdated,
}: {
  clinic: Clinic;
  onClinicUpdated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { logout } = useAuth();
  const [formData, setFormData] = useState(() => getInitialFormData(clinic));

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setFormData(getInitialFormData(clinic));
    }
    setOpen(newOpen);
  };

  const handleSubmit = () => {
    setLoading(true);
    (async () => {
      try {
        const token = localStorage.getItem("docita_admin_token");
        const res = await fetch(`${API_URL}/super-admin/clinics/${clinic.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(formData),
        });

        // Handle auth errors
        if (res.status === 401) {
          logout("Your session has expired. Please log in again.");
          return;
        }

        if (res.status === 404) {
          logout("Your account has been deleted. Please contact support.");
          return;
        }

        if (res.status === 403) {
          logout("You no longer have permission to update clinics.");
          return;
        }

        if (res.ok) {
          setOpen(false);
          onClinicUpdated();
          toast.success("Clinic updated successfully");
        } else {
          const error = await res.json();
          toast.error(error.message || "Failed to update clinic");
        }
      } catch (error) {
        console.error(error);
        toast.error("Error updating clinic");
      } finally {
        setLoading(false);
      }
    })();
  };

  return (
    <>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <CRUDDialog
        open={open}
        onOpenChange={handleOpenChange}
        title="Edit Clinic"
        description="Update clinic details and status."
        isLoading={loading}
        onSubmit={handleSubmit}
        submitLabel={loading ? "Updating..." : "Update Clinic"}
      >
        <form className="space-y-6">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Clinic Name</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-phone">Phone</Label>
                <Input
                  id="edit-phone"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-tier">Subscription Tier</Label>
                <Select
                  value={formData.tier}
                  onValueChange={(val) =>
                    setFormData({ ...formData, tier: val })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select tier" />
                  </SelectTrigger>
                  <SelectContent>
                    {AVAILABLE_TIERS.map((tier) => (
                      <SelectItem key={tier} value={tier}>
                        {TIER_INFO[tier].name.replace("Docita ", "")} (
                        {TIER_INFO[tier].tagline})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-address">Address</Label>
              <Input
                id="edit-address"
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-active">Status</Label>
              <Select
                value={formData.active ? "active" : "inactive"}
                onValueChange={(val) =>
                  setFormData({ ...formData, active: val === "active" })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </form>
      </CRUDDialog>
    </>
  );
}
