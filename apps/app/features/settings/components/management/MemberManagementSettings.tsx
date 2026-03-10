"use client";

import { FC, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  useClinicSettings,
  useCreateClinicDoctor,
  useCreateClinicReceptionist,
  useCreateDoctorSignatureUploadSession,
  useDeleteClinicMember,
  useReverifyDoctorRegistration,
  useUpdateClinicMember,
} from "@/hooks/api/use-settings";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { Skeleton } from "@workspace/ui/components/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@workspace/ui/components/form";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  Copy,
  Loader2,
  QrCode,
  ShieldCheck,
  ShieldX,
  UserPlus,
} from "lucide-react";
import { User } from "@workspace/types";
import { useMemberManagementLogic } from "@/features/settings/hooks/use-member-management-logic";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";

const inviteSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["DOCTOR", "RECEPTIONIST"]),
  phoneNumber: z.string().optional(),
  specialization: z.string().optional(),
  qualification: z.string().optional(),
  registrationNumber: z.string().optional(),
});

type InviteFormValues = z.infer<typeof inviteSchema>;

type MemberDraft = {
  name?: string;
  email?: string;
  phoneNumber?: string;
  role?: User["role"];
  specialization?: string;
  qualification?: string;
  registrationNumber?: string;
};

interface MemberManagementUIProps {
  members: User[];
  isLoading: boolean;
  error: Error | null;
  clinicId?: string;
  clinicReferralCode?: string | null;
}

export const MemberManagementUI: FC<MemberManagementUIProps> = ({
  members,
  isLoading,
  error,
  clinicId,
  clinicReferralCode,
}) => {
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<User | null>(null);
  const [memberDraft, setMemberDraft] = useState<MemberDraft>({});
  const [signatureUploadUrl, setSignatureUploadUrl] = useState<string | null>(
    null,
  );

  const { mutate: createDoctor, isPending: isCreatingDoctor } =
    useCreateClinicDoctor(clinicId);
  const { mutate: createReceptionist, isPending: isCreatingReceptionist } =
    useCreateClinicReceptionist(clinicId);
  const { mutate: updateMember, isPending: isUpdatingMember } =
    useUpdateClinicMember();
  const { mutate: deleteMember, isPending: isDeletingMember } =
    useDeleteClinicMember();
  const {
    mutate: createSignatureUploadSession,
    isPending: isCreatingSignatureUploadSession,
  } = useCreateDoctorSignatureUploadSession();
  const { mutate: reverifyDoctor, isPending: isReverifyingDoctor } =
    useReverifyDoctorRegistration();

  const isSaving = isCreatingDoctor || isCreatingReceptionist;
  const isManaging =
    isUpdatingMember ||
    isDeletingMember ||
    isCreatingSignatureUploadSession ||
    isReverifyingDoctor;

  const getVerificationBadgeVariant = (
    status?: User["verificationStatus"],
  ): "default" | "secondary" | "destructive" | "outline" => {
    if (status === "VERIFIED") return "default";
    if (status === "FAILED" || status === "REJECTED") return "destructive";
    if (status === "PENDING") return "secondary";
    return "outline";
  };

  const getVerificationBadgeLabel = (status?: User["verificationStatus"]) => {
    if (!status) return "Unverified";
    return status.charAt(0) + status.slice(1).toLowerCase();
  };

  const formatDate = (value?: string | Date) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("en-IN");
  };
  const openMemberDialog = (member: User) => {
    setSelectedMember(member);
    setMemberDraft({
      name: member.name,
      email: member.email,
      phoneNumber: member.phoneNumber,
      role: member.role,
      specialization: member.specialization,
      qualification: member.qualification,
      registrationNumber: member.registrationNumber,
    });
  };

  const handleSaveMember = () => {
    if (!selectedMember) return;

    updateMember(
      {
        memberId: selectedMember.id,
        name: memberDraft.name,
        email: memberDraft.email,
        phoneNumber: memberDraft.phoneNumber || undefined,
        role:
          memberDraft.role === "DOCTOR" ||
          memberDraft.role === "RECEPTIONIST" ||
          memberDraft.role === "ADMIN_DOCTOR"
            ? memberDraft.role
            : undefined,
        specialization: memberDraft.specialization || undefined,
        qualification: memberDraft.qualification || undefined,
        registrationNumber: memberDraft.registrationNumber || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Member updated successfully");
          setSelectedMember(null);
        },
        onError: (err) => {
          toast.error(`Failed to update member: ${err.message}`);
        },
      },
    );
  };

  const handleRemoveMember = () => {
    if (!selectedMember) return;
    const confirmed = window.confirm(
      `Remove ${selectedMember.name || "this member"} from clinic?`,
    );
    if (!confirmed) return;

    deleteMember(
      { memberId: selectedMember.id },
      {
        onSuccess: () => {
          toast.success("Member removed successfully");
          setSelectedMember(null);
        },
        onError: (err) => {
          toast.error(`Failed to remove member: ${err.message}`);
        },
      },
    );
  };

  const handleGenerateSignatureQr = (doctorId: string) => {
    createSignatureUploadSession(
      { doctorId },
      {
        onSuccess: (session) => {
          const uploadUrl = `${window.location.origin}/mobile-upload/${session.id}`;
          setSignatureUploadUrl(uploadUrl);
          toast.success("Signature upload link created");
        },
        onError: (err) => {
          toast.error(`Failed to create upload link: ${err.message}`);
        },
      },
    );
  };

  const handleReverifyDoctor = (doctorId: string) => {
    reverifyDoctor(
      { doctorId },
      {
        onSuccess: () => {
          toast.success("Doctor registration reverification triggered");
        },
        onError: (err) => {
          toast.error(`Failed to reverify doctor: ${err.message}`);
        },
      },
    );
  };

  const handleCopySignatureLink = async () => {
    if (!signatureUploadUrl) return;

    try {
      await navigator.clipboard.writeText(signatureUploadUrl);
      toast.success("Upload link copied");
    } catch {
      toast.error("Unable to copy upload link");
    }
  };

  const handleCopyClinicCode = async () => {
    if (!clinicReferralCode) {
      toast.error("Clinic code is not available");
      return;
    }

    try {
      await navigator.clipboard.writeText(clinicReferralCode);
      toast.success("Clinic code copied");
    } catch {
      toast.error("Unable to copy clinic code");
    }
  };

  const form = useForm<InviteFormValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: "RECEPTIONIST",
      phoneNumber: "",
      specialization: "",
      qualification: "",
      registrationNumber: "",
    },
  });

  const selectedRole = form.watch("role");
  const canInvite = !!clinicId;

  const sortedMembers = useMemo(
    () => [...members].sort((a, b) => a.name.localeCompare(b.name)),
    [members],
  );

  const onInviteSubmit = (data: InviteFormValues) => {
    if (!clinicId) {
      toast.error("Missing clinic context. Refresh and try again.");
      return;
    }

    if (data.role === "DOCTOR") {
      createDoctor(
        {
          name: data.name,
          email: data.email,
          password: data.password,
          phoneNumber: data.phoneNumber || undefined,
          specialization: data.specialization || undefined,
          qualification: data.qualification || undefined,
          registrationNumber: data.registrationNumber || undefined,
        },
        {
          onSuccess: () => {
            toast.success("Doctor invited successfully");
            setIsInviteOpen(false);
            form.reset();
          },
          onError: (err) => {
            toast.error(`Failed to invite doctor: ${err.message}`);
          },
        },
      );
      return;
    }

    createReceptionist(
      {
        name: data.name,
        email: data.email,
        password: data.password,
        phoneNumber: data.phoneNumber || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Receptionist invited successfully");
          setIsInviteOpen(false);
          form.reset();
        },
        onError: (err) => {
          toast.error(`Failed to invite receptionist: ${err.message}`);
        },
      },
    );
  };

  if (isLoading) {
    return (
      <Card className="border-none shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Team Members</CardTitle>
            <CardDescription>Loading team members...</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 p-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-none shadow-lg">
        <CardContent className="py-8 text-center text-muted-foreground">
          Failed to load team members
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-none shadow-lg">
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>Manage clinic staff and permissions</CardDescription>
        </div>
        <div className="flex w-full flex-col gap-2 md:w-auto md:items-end">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">Clinic code</span>
            <code className="rounded bg-muted px-2 py-1 text-xs font-semibold tracking-wide">
              {clinicReferralCode || "Not available"}
            </code>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopyClinicCode}
              disabled={!clinicReferralCode}
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy
            </Button>
          </div>
          <p className="text-xs text-muted-foreground md:text-right">
            Share this code so staff can join from the clinic selection page.
          </p>
          <Button
            size="sm"
            onClick={() => setIsInviteOpen(true)}
            disabled={!canInvite}
            className="w-full md:w-auto"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Invite Member
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {sortedMembers.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            No team members found. Invite your first team member.
          </div>
        ) : (
          <div className="space-y-3">
            {sortedMembers.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                    {member.name
                      ?.split(" ")
                      .map((n: string) => n[0])
                      .join("")
                      .toUpperCase() || "?"}
                  </div>
                  <div>
                    <p className="font-medium">{member.name || "Unknown"}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>{member.email}</span>
                      <Badge variant="outline">{member.role || "Staff"}</Badge>
                      {(member.role === "DOCTOR" ||
                        member.role === "ADMIN_DOCTOR") && (
                        <>
                          <Badge
                            variant={getVerificationBadgeVariant(
                              member.verificationStatus,
                            )}
                          >
                            {getVerificationBadgeLabel(member.verificationStatus)}
                          </Badge>
                          <Badge
                            variant={
                              member.signatureUploadedAt ? "default" : "outline"
                            }
                          >
                            Signature {member.signatureUploadedAt ? "Ready" : "Missing"}
                          </Badge>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openMemberDialog(member)}
                >
                  Manage
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>
              Add a doctor or receptionist to your clinic team.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onInviteSubmit)}
              className="space-y-4"
              noValidate
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <Label>Name</Label>
                      <FormControl>
                        <Input placeholder="Full name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <Label>Role</Label>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="RECEPTIONIST">
                            Receptionist
                          </SelectItem>
                          <SelectItem value="DOCTOR">Doctor</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <Label>Email</Label>
                      <FormControl>
                        <Input type="email" placeholder="name@clinic.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <Label>Phone (optional)</Label>
                      <FormControl>
                        <Input placeholder="+91..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <Label>Temporary Password</Label>
                    <FormControl>
                      <Input type="password" placeholder="At least 8 characters" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {selectedRole === "DOCTOR" && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="specialization"
                    render={({ field }) => (
                      <FormItem>
                        <Label>Specialization</Label>
                        <FormControl>
                          <Input placeholder="Cardiology" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="qualification"
                    render={({ field }) => (
                      <FormItem>
                        <Label>Qualification</Label>
                        <FormControl>
                          <Input placeholder="MBBS, MD" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="registrationNumber"
                    render={({ field }) => (
                      <FormItem>
                        <Label>Registration #</Label>
                        <FormControl>
                          <Input placeholder="Medical council no." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              <DialogFooter className="flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsInviteOpen(false)}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!canInvite || isSaving}
                  className="w-full sm:w-auto"
                >
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Invite Member
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!selectedMember}
        onOpenChange={(open) => {
          if (!open) setSelectedMember(null);
        }}
      >
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Member Details</DialogTitle>
            <DialogDescription>
              View team member profile information.
            </DialogDescription>
          </DialogHeader>
          {selectedMember && (
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-muted-foreground">Name</p>
                <Input
                  value={memberDraft.name || ""}
                  onChange={(e) =>
                    setMemberDraft((prev) => ({ ...prev, name: e.target.value }))
                  }
                />
              </div>
              <div>
                <p className="text-muted-foreground">Email</p>
                <Input
                  type="email"
                  value={memberDraft.email || ""}
                  onChange={(e) =>
                    setMemberDraft((prev) => ({ ...prev, email: e.target.value }))
                  }
                />
              </div>
              <div>
                <p className="text-muted-foreground">Role</p>
                <Select
                  value={String(memberDraft.role || "RECEPTIONIST")}
                  onValueChange={(value) =>
                    setMemberDraft((prev) => ({ ...prev, role: value as User["role"] }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RECEPTIONIST">Receptionist</SelectItem>
                    <SelectItem value="DOCTOR">Doctor</SelectItem>
                    <SelectItem value="ADMIN_DOCTOR">Admin Doctor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="text-muted-foreground">Phone</p>
                <Input
                  value={memberDraft.phoneNumber || ""}
                  onChange={(e) =>
                    setMemberDraft((prev) => ({
                      ...prev,
                      phoneNumber: e.target.value,
                    }))
                  }
                />
              </div>
              {memberDraft.role === "DOCTOR" && (
                <>
                  <div>
                    <p className="text-muted-foreground">Specialization</p>
                    <Input
                      value={memberDraft.specialization || ""}
                      onChange={(e) =>
                        setMemberDraft((prev) => ({
                          ...prev,
                          specialization: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <p className="text-muted-foreground">Qualification</p>
                    <Input
                      value={memberDraft.qualification || ""}
                      onChange={(e) =>
                        setMemberDraft((prev) => ({
                          ...prev,
                          qualification: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <p className="text-muted-foreground">Registration #</p>
                    <Input
                      value={memberDraft.registrationNumber || ""}
                      onChange={(e) =>
                        setMemberDraft((prev) => ({
                          ...prev,
                          registrationNumber: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="rounded-lg border p-3 space-y-3 bg-muted/20">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant={getVerificationBadgeVariant(
                          selectedMember.verificationStatus,
                        )}
                      >
                        {selectedMember.verificationStatus === "VERIFIED" ? (
                          <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                        ) : (
                          <ShieldX className="mr-1 h-3.5 w-3.5" />
                        )}
                        {getVerificationBadgeLabel(selectedMember.verificationStatus)}
                      </Badge>
                      <Badge
                        variant={
                          selectedMember.signatureUploadedAt ? "default" : "outline"
                        }
                      >
                        Signature {selectedMember.signatureUploadedAt ? "Ready" : "Missing"}
                      </Badge>
                    </div>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <p>
                        Last verification: {formatDate(selectedMember.verificationCheckedAt)}
                      </p>
                      <p>
                        Signature uploaded: {formatDate(selectedMember.signatureUploadedAt)}
                      </p>
                      {selectedMember.verificationReason && (
                        <p>Verification note: {selectedMember.verificationReason}</p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleGenerateSignatureQr(selectedMember.id)}
                        disabled={isManaging}
                      >
                        {isCreatingSignatureUploadSession && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        {!isCreatingSignatureUploadSession && (
                          <QrCode className="mr-2 h-4 w-4" />
                        )}
                        Signature Upload Link
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleReverifyDoctor(selectedMember.id)}
                        disabled={isManaging}
                      >
                        {isReverifyingDoctor && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Reverify Registration
                      </Button>
                    </div>
                  </div>
                </>
              )}
              <div>
                <p className="text-muted-foreground">Created</p>
                <p className="font-medium">
                  {selectedMember.createdAt
                    ? new Date(selectedMember.createdAt).toLocaleDateString("en-IN")
                    : "-"}
                </p>
              </div>
            </div>
          )}
          <DialogFooter className="flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-between">
            <Button
              variant="outline"
              onClick={() => setSelectedMember(null)}
              disabled={isManaging}
              className="w-full sm:w-auto"
            >
              Close
            </Button>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:justify-end">
              <Button onClick={handleSaveMember} disabled={isManaging} className="w-full sm:w-auto">
                {isUpdatingMember && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save Changes
              </Button>
            <Button
              variant="destructive"
              onClick={handleRemoveMember}
              disabled={isManaging}
              className="w-full sm:w-auto"
            >
              {isDeletingMember && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Remove
            </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!signatureUploadUrl}
        onOpenChange={(open) => {
          if (!open) setSignatureUploadUrl(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Doctor Signature Upload</DialogTitle>
            <DialogDescription>
              Scan this QR code or share the link to upload a doctor signature.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-2">
            <div className="rounded-lg border bg-white p-4">
              {signatureUploadUrl && <QRCodeSVG value={signatureUploadUrl} size={192} />}
            </div>
            <div className="w-full rounded-md border bg-muted/20 px-3 py-2 text-xs text-muted-foreground break-all">
              {signatureUploadUrl}
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleCopySignatureLink}
            >
              <Copy className="mr-2 h-4 w-4" />
              Copy Upload Link
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export const MemberManagementSettings: FC = () => {
  const { data: clinic } = useClinicSettings();
  const { members, isLoading, error } = useMemberManagementLogic();

  return (
    <MemberManagementUI
      members={members}
      isLoading={isLoading}
      error={error}
      clinicId={clinic?.id}
      clinicReferralCode={clinic?.referralCode}
    />
  );
};
