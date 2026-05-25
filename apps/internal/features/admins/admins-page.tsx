"use client";

import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";

import { useEffect, useMemo, useState } from "react";
import {
  type InternalAdminUser,
  useInternalClinicAdmins,
  useInternalClinics,
} from "@workspace/data-access/internal";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@workspace/ui/components/form/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { EmptyState } from "@workspace/ui/components/feedback/empty-state";
import { AppPageScaffold } from "@workspace/ui/components/layout/app-page-scaffold";
import { PageHeader } from "@workspace/ui/components/layout/page-header";
import { DataState } from "@workspace/ui/components/data-display/data-state";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/overlay/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/form/select";
import { Label } from "@workspace/ui/components/form/label";
import {
  Edit2,
  Eye,
  Plus,
  Search,
  Shield,
  UserCheck,
  Users,
  UserX,
} from "lucide-react";
import { getUserFacingErrorMessage } from "@workspace/utils";
import { useAuth } from "@/lib/auth/auth";
import { client } from "@/lib/api/api-client";
import {
  formatInternalListDate,
  formatInternalTimestamp,
} from "@/lib/formatters/format-display-date";
import { internalQueryKeys } from "@/lib/api/query-keys";
import { useInternalFiltersStore } from "@/lib/stores/internal-filters-store";
import { toast } from "sonner";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import {
  type InternalClinicAdminType,
  internalClinicAdminTypeSchema,
} from "@workspace/types";

type Admin = InternalAdminUser;

const ADMIN_TYPE_LABELS = {
  admin: "Clinic Admin",
  admin_doctor: "Admin Doctor",
};
const EMPTY_CLINICS: { id: string; name: string }[] = [];

export default function AdminsPage() {
  const queryClient = useQueryClient();
  const { adminSearch, selectedClinic, setAdminSearch, setSelectedClinic } =
    useInternalFiltersStore();
  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [createForm, setCreateForm] = useState<{
    name: string;
    email: string;
    password: string;
    phoneNumber: string;
    adminType: InternalClinicAdminType;
  }>({
    name: "",
    email: "",
    password: "",
    phoneNumber: "",
    adminType: "admin",
  });
  const [editForm, setEditForm] = useState<{
    name: string;
    email: string;
    phoneNumber: string;
    adminType: InternalClinicAdminType;
  }>({
    name: "",
    email: "",
    phoneNumber: "",
    adminType: "admin",
  });
  const { token } = useAuth();

  const clinicsQuery = useInternalClinics(token);

  const clinics = useMemo(
    () => clinicsQuery.data ?? EMPTY_CLINICS,
    [clinicsQuery.data],
  );

  useEffect(() => {
    if (!selectedClinic || selectedClinic === "all") {
      if (clinics.length > 0) {
        setSelectedClinic(clinics[0]?.id ?? "");
      }
    }
  }, [clinics, selectedClinic, setSelectedClinic]);

  const adminsQuery = useInternalClinicAdmins(token, selectedClinic);

  const admins = adminsQuery.data ?? [];

  const invalidateAdmins = async () => {
    await queryClient.invalidateQueries({
      queryKey: internalQueryKeys.internal.clinicAdmins(
        selectedClinic || "none",
      ),
    });
  };

  const createAdminMutation = useMutation({
    mutationFn: () =>
      client.post(`/internal/clinics/${selectedClinic}/admins`, {
        name: createForm.name,
        email: createForm.email,
        password: createForm.password,
        phoneNumber: createForm.phoneNumber || undefined,
        adminType: createForm.adminType,
      }),
    onSuccess: async () => {
      toast.success("Admin created successfully");
      setIsCreateOpen(false);
      setCreateForm({
        name: "",
        email: "",
        password: "",
        phoneNumber: "",
        adminType: "admin",
      });
      await invalidateAdmins();
    },
  });

  const updateAdminMutation = useMutation({
    mutationFn: () =>
      client.patch(`/internal/admins/${selectedAdmin?.id}`, {
        name: editForm.name,
        email: editForm.email,
        phoneNumber: editForm.phoneNumber || undefined,
        adminType: editForm.adminType,
      }),
    onSuccess: async () => {
      toast.success("Admin updated successfully");
      setIsEditOpen(false);
      await invalidateAdmins();
    },
  });

  const deactivateAdminMutation = useMutation({
    mutationFn: (adminId: string) =>
      client.patch(`/internal/admins/${adminId}/deactivate`, {}),
    onSuccess: async () => {
      toast.success("Admin deactivated. They can no longer sign in.");
      await invalidateAdmins();
    },
  });

  const activateAdminMutation = useMutation({
    mutationFn: (adminId: string) =>
      client.patch(`/internal/admins/${adminId}/activate`, {}),
    onSuccess: async () => {
      toast.success("Admin re-enabled for sign-in.");
      await invalidateAdmins();
    },
  });

  const handleCreateAdmin = async () => {
    if (!selectedClinic || !token || selectedClinic === "all") return;

    if (!createForm.name || !createForm.email || !createForm.password) {
      showUserFacingErrorToast(
        "Enter the admin's name, email, and password before continuing",
      );
      return;
    }

    try {
      await createAdminMutation.mutateAsync();
    } catch {
      showUserFacingErrorToast(
        "We could not create this admin account. Please try again.",
      );
    }
  };

  const handleViewAdmin = (admin: Admin) => {
    setSelectedAdmin(admin);
    setIsViewOpen(true);
  };

  const handleEditAdmin = (admin: Admin) => {
    setSelectedAdmin(admin);
    setEditForm({
      name: admin.name,
      email: admin.email,
      phoneNumber: admin.phoneNumber || "",
      adminType: admin.role === "ADMIN_DOCTOR" ? "admin_doctor" : "admin",
    });
    setIsEditOpen(true);
  };

  const handleSaveAdmin = async () => {
    if (!selectedAdmin || !token) return;

    if (!editForm.name || !editForm.email) {
      showUserFacingErrorToast(
        "Enter the admin's name and email before saving",
      );
      return;
    }

    try {
      await updateAdminMutation.mutateAsync();
    } catch {
      showUserFacingErrorToast(
        "We could not save this admin account. Please try again.",
      );
    }
  };

  const handleDeactivateAdmin = async (adminId: string) => {
    if (!token) return;

    if (
      !confirm(
        "Deactivate this admin? They will not be able to sign in until re-enabled.",
      )
    ) {
      return;
    }

    try {
      await deactivateAdminMutation.mutateAsync(adminId);
    } catch {
      showUserFacingErrorToast(
        "We could not deactivate this admin account. Please try again.",
      );
    }
  };

  const handleActivateAdmin = async (adminId: string) => {
    if (!token) return;

    try {
      await activateAdminMutation.mutateAsync(adminId);
    } catch {
      showUserFacingErrorToast(
        "We could not re-enable this admin account. Please try again.",
      );
    }
  };

  const filteredAdmins = admins.filter(
    (admin) =>
      admin.name.toLowerCase().includes(adminSearch.toLowerCase()) ||
      admin.email.toLowerCase().includes(adminSearch.toLowerCase()),
  );
  const loading = clinicsQuery.isLoading || adminsQuery.isLoading;
  const loadError =
    clinicsQuery.isError || adminsQuery.isError
      ? getUserFacingErrorMessage(
          clinicsQuery.error ?? adminsQuery.error,
          {
            context: "load",
            fallback: "We could not load admins. Please try again.",
          },
        )
      : null;
  const pageStatus = loading
    ? "loading"
    : loadError
      ? "error"
      : "success";
  const saving =
    createAdminMutation.isPending ||
    updateAdminMutation.isPending ||
    deactivateAdminMutation.isPending ||
    activateAdminMutation.isPending;

  const getRoleLabel = (role: string) => {
    return role === "ADMIN_DOCTOR"
      ? ADMIN_TYPE_LABELS.admin_doctor
      : ADMIN_TYPE_LABELS.admin;
  };

  const getRoleBadgeVariant = (role: string) => {
    return role === "ADMIN_DOCTOR" ? "default" : "outline";
  };

  return (
    <AppPageScaffold
      header={
        <PageHeader
          title="Admins"
          description="Manage clinic administrators and admin doctors"
          size="compact"
        />
      }
    >
      <DataState
        status={pageStatus}
        loadingMessage="Loading admins…"
        errorMessage={loadError ?? undefined}
        onRetry={() => {
          void clinicsQuery.refetch();
          void adminsQuery.refetch();
        }}
      >
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Enter name or email"
                  value={adminSearch}
                  onChange={(e) => setAdminSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={selectedClinic} onValueChange={setSelectedClinic}>
              <SelectTrigger className="w-full md:w-[250px]">
                <SelectValue placeholder="Facility" />
              </SelectTrigger>
              <SelectContent>
                {Array.isArray(clinics) &&
                  clinics.map((clinic) => (
                    <SelectItem key={clinic.id} value={clinic.id}>
                      {clinic.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Admin
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Admins ({filteredAdmins.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredAdmins.length === 0 ? (
            <EmptyState
              icon={Shield}
              title={
                selectedClinic
                  ? "No admins found"
                  : "Select a clinic to view admins"
              }
              description={
                selectedClinic
                  ? "Create one by clicking 'Add Admin'."
                  : "Choose a facility to load the administrator list."
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Access</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAdmins.map((admin) => (
                  <TableRow key={admin.id}>
                    <TableCell className="font-medium">{admin.name}</TableCell>
                    <TableCell>{admin.email}</TableCell>
                    <TableCell>
                      {admin.phoneNumber || (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(admin.role)}>
                        {getRoleLabel(admin.role)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {admin.appLoginDisabled ? (
                        <Badge variant="destructive">Disabled</Badge>
                      ) : (
                        <Badge variant="secondary">Active</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {formatInternalListDate(admin.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewAdmin(admin)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditAdmin(admin)}
                          disabled={admin.appLoginDisabled}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        {admin.appLoginDisabled ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleActivateAdmin(admin.id)}
                          >
                            <UserCheck className="h-4 w-4" />
                            <span className="sr-only">Re-enable admin</span>
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDeactivateAdmin(admin.id)}
                          >
                            <UserX className="h-4 w-4" />
                            <span className="sr-only">Deactivate admin</span>
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      </DataState>

      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              {selectedAdmin?.name}
            </DialogTitle>
            <DialogDescription>Admin details and information</DialogDescription>
          </DialogHeader>

          {selectedAdmin && (
            <div className="space-y-4">
              <div>
                <Label className="text-muted-foreground">Name</Label>
                <p className="font-medium">{selectedAdmin.name}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Email</Label>
                <p className="font-medium">{selectedAdmin.email}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Phone</Label>
                <p className="font-medium">
                  {selectedAdmin.phoneNumber || "-"}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">Type</Label>
                <p className="font-medium">
                  <Badge variant={getRoleBadgeVariant(selectedAdmin.role)}>
                    {getRoleLabel(selectedAdmin.role)}
                  </Badge>
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">Created</Label>
                <p className="font-medium">
                  {formatInternalTimestamp(selectedAdmin.createdAt)}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Create New Admin
            </DialogTitle>
            <DialogDescription>
              Add a new administrator to the selected clinic
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                placeholder="Admin name"
                value={createForm.name}
                onChange={(e) =>
                  setCreateForm({ ...createForm, name: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="Email"
                value={createForm.email}
                onChange={(e) =>
                  setCreateForm({ ...createForm, email: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter password"
                value={createForm.password}
                onChange={(e) =>
                  setCreateForm({ ...createForm, password: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Phone Number</Label>
              <Input
                id="phoneNumber"
                type="tel"
                placeholder="Phone number"
                value={createForm.phoneNumber}
                onChange={(e) =>
                  setCreateForm({ ...createForm, phoneNumber: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="adminType">Admin Type *</Label>
              <Select
                value={createForm.adminType}
                onValueChange={(value) => {
                  const parsed = internalClinicAdminTypeSchema.safeParse(value);
                  if (!parsed.success) return;
                  setCreateForm({ ...createForm, adminType: parsed.data });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Admin type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Clinic Admin (manages clinics with multiple doctors)
                    </div>
                  </SelectItem>
                  <SelectItem value="admin_doctor">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Admin Doctor (for single-doctor clinics)
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {createForm.adminType === "admin_doctor"
                  ? "Admin Doctor can manage clinic operations and provide clinical care"
                  : "Clinic Admin manages clinic operations and staff"}
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setIsCreateOpen(false);
                  setCreateForm({
                    name: "",
                    email: "",
                    password: "",
                    phoneNumber: "",
                    adminType: "admin",
                  });
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleCreateAdmin} disabled={saving}>
                {saving && <DocitaLoadingIndicator variant="inline" decorative className="mr-2" />}
                Create Admin
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="h-5 w-5" />
              Edit Admin
            </DialogTitle>
            <DialogDescription>Update admin information</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name *</Label>
              <Input
                id="edit-name"
                placeholder="Admin name"
                value={editForm.name}
                onChange={(e) =>
                  setEditForm({ ...editForm, name: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-email">Email *</Label>
              <Input
                id="edit-email"
                type="email"
                placeholder="Email"
                value={editForm.email}
                onChange={(e) =>
                  setEditForm({ ...editForm, email: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-phoneNumber">Phone Number</Label>
              <Input
                id="edit-phoneNumber"
                type="tel"
                placeholder="Phone number"
                value={editForm.phoneNumber}
                onChange={(e) =>
                  setEditForm({ ...editForm, phoneNumber: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-adminType">Admin Type *</Label>
              <Select
                value={editForm.adminType}
                onValueChange={(value) => {
                  const parsed = internalClinicAdminTypeSchema.safeParse(value);
                  if (!parsed.success) return;
                  setEditForm({ ...editForm, adminType: parsed.data });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Admin type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">
                    Clinic Admin (manages clinics with multiple doctors)
                  </SelectItem>
                  <SelectItem value="admin_doctor">
                    Admin Doctor (for single-doctor clinics)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveAdmin} disabled={saving}>
                {saving && <DocitaLoadingIndicator variant="inline" decorative className="mr-2" />}
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppPageScaffold>
  );
}
