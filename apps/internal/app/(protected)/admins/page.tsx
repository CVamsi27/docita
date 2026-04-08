"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Badge } from "@workspace/ui/components/badge";
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
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Label } from "@workspace/ui/components/label";
import {
  Edit2,
  Eye,
  Loader2,
  Plus,
  Search,
  Shield,
  Trash2,
  Users,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { client } from "@/lib/api-client";
import { internalQueryKeys } from "@/lib/query-keys";
import { useInternalFiltersStore } from "@/lib/stores/internal-filters-store";
import { toast } from "sonner";

interface Admin {
  id: string;
  name: string;
  email: string;
  phoneNumber?: string;
  role: "ADMIN" | "ADMIN_DOCTOR";
  createdAt: string;
  updatedAt: string;
}

interface Clinic {
  id: string;
  name: string;
}

const ADMIN_TYPE_LABELS = {
  admin: "Clinic Admin",
  admin_doctor: "Admin Doctor",
};
const EMPTY_CLINICS: Clinic[] = [];

export default function AdminsPage() {
  const queryClient = useQueryClient();
  const { adminSearch, selectedClinic, setAdminSearch, setSelectedClinic } =
    useInternalFiltersStore();
  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    email: "",
    password: "",
    phoneNumber: "",
    adminType: "admin" as "admin" | "admin_doctor",
  });
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    phoneNumber: "",
    adminType: "admin" as "admin" | "admin_doctor",
  });
  const { token } = useAuth();

  const clinicsQuery = useQuery({
    queryKey: internalQueryKeys.internal.clinics(),
    queryFn: async () => {
      const data = await client.get<Clinic[] | { items?: Clinic[] }>(
        "/internal/clinics",
      );
      return Array.isArray(data) ? data : (data.items ?? []);
    },
    enabled: Boolean(token),
  });

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

  const adminsQuery = useQuery({
    queryKey: internalQueryKeys.internal.clinicAdmins(selectedClinic || "none"),
    queryFn: () =>
      client.get<Admin[]>(`/internal/clinics/${selectedClinic}/admins`),
    enabled: Boolean(token && selectedClinic && selectedClinic !== "all"),
  });

  const admins = adminsQuery.data ?? [];

  const invalidateAdmins = async () => {
    await queryClient.invalidateQueries({
      queryKey: internalQueryKeys.internal.clinicAdmins(selectedClinic || "none"),
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

  const deleteAdminMutation = useMutation({
    mutationFn: (adminId: string) =>
      client.patch(`/internal/admins/${adminId}/deactivate`, {}),
    onSuccess: async () => {
      toast.success("Admin deleted successfully");
      await invalidateAdmins();
    },
  });

  const handleCreateAdmin = async () => {
    if (!selectedClinic || !token || selectedClinic === "all") return;

    if (!createForm.name || !createForm.email || !createForm.password) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      await createAdminMutation.mutateAsync();
    } catch {
      toast.error("Error creating admin");
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
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      await updateAdminMutation.mutateAsync();
    } catch {
      toast.error("Error updating admin");
    }
  };

  const handleDeleteAdmin = async (adminId: string) => {
    if (!token) return;

    if (!confirm("Are you sure you want to delete this admin?")) {
      return;
    }

    try {
      await deleteAdminMutation.mutateAsync(adminId);
    } catch {
      toast.error("Error deleting admin");
    }
  };

  const filteredAdmins = admins.filter(
    (admin) =>
      admin.name.toLowerCase().includes(adminSearch.toLowerCase()) ||
      admin.email.toLowerCase().includes(adminSearch.toLowerCase()),
  );
  const loading = clinicsQuery.isLoading || adminsQuery.isLoading;
  const saving =
    createAdminMutation.isPending ||
    updateAdminMutation.isPending ||
    deleteAdminMutation.isPending;

  const getRoleLabel = (role: string) => {
    return role === "ADMIN_DOCTOR"
      ? ADMIN_TYPE_LABELS.admin_doctor
      : ADMIN_TYPE_LABELS.admin;
  };

  const getRoleBadgeVariant = (role: string) => {
    return role === "ADMIN_DOCTOR" ? "default" : "outline";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admins</h1>
          <p className="text-muted-foreground">
            Manage clinic administrators and admin doctors
          </p>
        </div>
      </div>

      {}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search admins by name or email..."
                  value={adminSearch}
                  onChange={(e) => setAdminSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={selectedClinic} onValueChange={setSelectedClinic}>
              <SelectTrigger className="w-full md:w-[250px]">
                <SelectValue placeholder="Select clinic" />
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

      {}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Admins ({filteredAdmins.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredAdmins.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {selectedClinic
                ? "No admins found. Create one by clicking 'Add Admin'"
                : "Select a clinic to view admins"}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Type</TableHead>
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
                      {new Date(admin.createdAt).toLocaleDateString()}
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
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDeleteAdmin(admin.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {}
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
                  {new Date(selectedAdmin.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {}
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
                placeholder="admin@clinic.com"
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
                placeholder="Enter a strong password"
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
                placeholder="+91 XXXXX XXXXX"
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
                onValueChange={(value) =>
                  setCreateForm({
                    ...createForm,
                    adminType: value as "admin" | "admin_doctor",
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select admin type" />
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
                  ? "Admin Doctor can manage clinic operations and also act as a doctor"
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
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Admin
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {}
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
                placeholder="admin@clinic.com"
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
                placeholder="+91 XXXXX XXXXX"
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
                onValueChange={(value) =>
                  setEditForm({
                    ...editForm,
                    adminType: value as "admin" | "admin_doctor",
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select admin type" />
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
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
