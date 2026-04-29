"use client";

import { FC, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
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
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form";
import { Input } from "@workspace/ui/components/input";
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
import { QrCodeCard } from "@/features/_shared/components/signature/qr-code-card";
import { CopyableLinkField } from "@/features/_shared/components/signature/copyable-link-field";
import { toAbsoluteAppUrl } from "@/lib/url";
import { showUserFacingErrorToast } from "@/lib/user-facing-errors";
import { useFacilityLabel } from "@/lib/facility-label";

const inviteSchema = z
  .object({
    name: z.string().min(1, "Enter the team member's name"),
    email: z.string().email("Please enter a valid email address"),
    password: z.string().min(8, "Use at least 8 characters"),
    role: z.enum(["DOCTOR", "NURSE", "RECEPTIONIST"]),
    phoneNumber: z.string().optional(),
    specialization: z.string().optional(),
    qualification: z.string().optional(),
    registrationNumber: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.role === "DOCTOR" && !data.registrationNumber?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["registrationNumber"],
        message: "Enter the medical registration number",
      });
    }
  });

const memberSchema = z
  .object({
    name: z.string().min(1, "Enter the team member's name"),
    email: z.string().email("Please enter a valid email address"),
    phoneNumber: z.string().optional(),
    role: z.enum(["DOCTOR", "NURSE", "RECEPTIONIST", "ADMIN_DOCTOR"]),
    specialization: z.string().optional(),
    qualification: z.string().optional(),
    registrationNumber: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (
      (data.role === "DOCTOR" || data.role === "ADMIN_DOCTOR") &&
      !data.registrationNumber?.trim()
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["registrationNumber"],
        message: "Enter the medical registration number",
      });
    }
  });

type InviteFormValues = z.infer<typeof inviteSchema>;
type MemberFormValues = z.infer<typeof memberSchema>;

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
  const [signatureUploadUrl, setSignatureUploadUrl] = useState<string | null>(
    null,
  );
  const [signatureUploadDoctorId, setSignatureUploadDoctorId] = useState<
    string | null
  >(null);
  const [signatureUploadInitialAt, setSignatureUploadInitialAt] = useState<
    string | Date | null
  >(null);
  const facilityLabel = useFacilityLabel();
  const queryClient = useQueryClient();

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

  const latestSignatureMember = useMemo(
    () =>
      signatureUploadDoctorId
        ? members.find((member) => member.id === signatureUploadDoctorId)
        : undefined,
    [members, signatureUploadDoctorId],
  );

  useEffect(() => {
    if (!signatureUploadUrl || !signatureUploadDoctorId) return;

    const interval = window.setInterval(() => {
      void queryClient.invalidateQueries({ queryKey: ["clinic", "members"] });
    }, 3000);

    return () => window.clearInterval(interval);
  }, [queryClient, signatureUploadDoctorId, signatureUploadUrl]);

  useEffect(() => {
    if (!signatureUploadUrl || !latestSignatureMember?.signatureUploadedAt) {
      return;
    }

    const uploadedAt = new Date(
      latestSignatureMember.signatureUploadedAt,
    ).toISOString();
    const initialUploadedAt = signatureUploadInitialAt
      ? new Date(signatureUploadInitialAt).toISOString()
      : null;

    if (uploadedAt === initialUploadedAt) {
      return;
    }

    toast.success("Signature uploaded successfully");
    setSignatureUploadUrl(null);
    setSignatureUploadDoctorId(null);
    setSignatureUploadInitialAt(null);
  }, [latestSignatureMember, signatureUploadInitialAt, signatureUploadUrl]);

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
    return date.toLocaleDateString();
  };

  const form = useForm<InviteFormValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: "NURSE",
      phoneNumber: "",
      specialization: "",
      qualification: "",
      registrationNumber: "",
    },
  });

  const memberForm = useForm<MemberFormValues>({
    resolver: zodResolver(memberSchema),
    defaultValues: {
      name: "",
      email: "",
      phoneNumber: "",
      role: "NURSE",
      specialization: "",
      qualification: "",
      registrationNumber: "",
    },
  });

  const selectedRole = form.watch("role");
  const selectedMemberRole = memberForm.watch("role");
  const isSelectedMemberDoctor =
    selectedMemberRole === "DOCTOR" || selectedMemberRole === "ADMIN_DOCTOR";
  const canInvite = !!clinicId;

  const openMemberDialog = (member: User) => {
    setSelectedMember(member);
    memberForm.reset({
      name: member.name ?? "",
      email: member.email ?? "",
      phoneNumber: member.phoneNumber ?? "",
      role:
        member.role === "DOCTOR" ||
        member.role === "NURSE" ||
        member.role === "RECEPTIONIST" ||
        member.role === "ADMIN_DOCTOR"
          ? member.role
          : "NURSE",
      specialization: member.specialization ?? "",
      qualification: member.qualification ?? "",
      registrationNumber: member.registrationNumber ?? "",
    });
  };

  const handleSaveMember = (data: MemberFormValues) => {
    if (!selectedMember) return;

    updateMember(
      {
        memberId: selectedMember.id,
        name: data.name,
        email: data.email,
        phoneNumber: data.phoneNumber || undefined,
        role: data.role,
        specialization: data.specialization || undefined,
        qualification: data.qualification || undefined,
        registrationNumber: data.registrationNumber || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Member updated successfully");
          setSelectedMember(null);
        },
        onError: (err) => {
          showUserFacingErrorToast(
            err,
            "We could not update this team member. Please try again.",
            "save",
          );
        },
      },
    );
  };

  const handleRemoveMember = () => {
    if (!selectedMember) return;
    const confirmed = window.confirm(
      `Remove ${selectedMember.name || "this member"} from ${facilityLabel.toLowerCase()}?`,
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
          showUserFacingErrorToast(
            err,
            "We could not remove this team member. Please try again.",
            "delete",
          );
        },
      },
    );
  };

  const handleGenerateSignatureQr = (doctorId: string) => {
    const doctor = members.find((member) => member.id === doctorId);
    createSignatureUploadSession(
      { doctorId },
      {
        onSuccess: (session) => {
          const uploadUrl = toAbsoluteAppUrl(session.uploadUrl);
          setSignatureUploadUrl(uploadUrl);
          setSignatureUploadDoctorId(doctorId);
          setSignatureUploadInitialAt(doctor?.signatureUploadedAt ?? null);
          toast.success("Signature upload link created");
        },
        onError: (err) => {
          showUserFacingErrorToast(
            err,
            "We could not create this upload link right now. Please try again.",
            "save",
          );
        },
      },
    );
  };

  const handleReverifyDoctor = async (doctorId: string) => {
    const hasRegistrationNumber = await memberForm.trigger(
      "registrationNumber",
      { shouldFocus: true },
    );

    if (!hasRegistrationNumber) {
      showUserFacingErrorToast(
        "Please enter the highlighted registration number before reverifying.",
        "Please check the highlighted fields and try again.",
        "form",
      );
      return;
    }

    reverifyDoctor(
      { doctorId },
      {
        onSuccess: () => {
          toast.success("Doctor registration reverification triggered");
        },
        onError: (err) => {
          showUserFacingErrorToast(
            err,
            "We could not restart this doctor's verification. Please try again.",
            "save",
          );
        },
      },
    );
  };

  const handleCopySignatureLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Upload link copied");
    } catch {
      showUserFacingErrorToast(
        "We could not copy this upload link. Please try again.",
      );
    }
  };

  const handleCopyClinicCode = async () => {
    if (!clinicReferralCode) {
      showUserFacingErrorToast(
        `The ${facilityLabel.toLowerCase()} code is not ready yet. Please refresh and try again.`,
      );
      return;
    }

    try {
      await navigator.clipboard.writeText(clinicReferralCode);
      toast.success(`${facilityLabel} code copied`);
    } catch {
      showUserFacingErrorToast(
        `We could not copy this ${facilityLabel.toLowerCase()} code. Please try again.`,
      );
    }
  };

  const sortedMembers = useMemo(
    () => [...members].sort((a, b) => a.name.localeCompare(b.name)),
    [members],
  );

  const onInviteSubmit = (data: InviteFormValues) => {
    if (!clinicId) {
      showUserFacingErrorToast(
        "We could not identify this facility. Please refresh and try again.",
      );
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
            showUserFacingErrorToast(
              err,
              "We could not send this doctor invitation. Please try again.",
              "save",
            );
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
        role:
          data.role === "NURSE" || data.role === "RECEPTIONIST"
            ? data.role
            : undefined,
      },
      {
        onSuccess: () => {
          toast.success(
            `${data.role === "NURSE" ? "Nurse" : "Receptionist"} invited successfully`,
          );
          setIsInviteOpen(false);
          form.reset();
        },
        onError: (err) => {
          showUserFacingErrorToast(
            err,
            `We could not send this ${data.role === "NURSE" ? "nurse" : "receptionist"} invitation. Please try again.`,
            "save",
          );
        },
      },
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Team Members</CardTitle>
            <CardDescription>
              Manage your {facilityLabel.toLowerCase()} staff
            </CardDescription>
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
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          We could not load your team members. Please try again.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>
            Manage {facilityLabel.toLowerCase()} staff and permissions
          </CardDescription>
        </div>
        <div className="flex w-full flex-col gap-2 md:w-auto md:items-end">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {facilityLabel} code
            </span>
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
            Share this code so staff can join from the{" "}
            {facilityLabel.toLowerCase()} selection page.
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
                            {getVerificationBadgeLabel(
                              member.verificationStatus,
                            )}
                          </Badge>
                          <Badge
                            variant={
                              member.signatureUploadedAt ? "default" : "outline"
                            }
                          >
                            Signature{" "}
                            {member.signatureUploadedAt ? "Ready" : "Missing"}
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
              Add a doctor, nurse, or receptionist to your facility team.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onInviteSubmit, () => {
                showUserFacingErrorToast(
                  "Please check the highlighted fields and try again.",
                  "Please check the highlighted fields and try again.",
                  "form",
                );
              })}
              className="space-y-4"
              noValidate
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
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
                      <FormLabel>Role</FormLabel>
                      <Select
                        value={field.value ?? "NURSE"}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="NURSE">Nurse</SelectItem>
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
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="name@facility.com"
                          {...field}
                        />
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
                      <FormLabel>Phone (optional)</FormLabel>
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
                    <FormLabel>Temporary Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="At least 8 characters"
                        {...field}
                      />
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
                        <FormLabel>Specialization</FormLabel>
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
                        <FormLabel>Qualification</FormLabel>
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
                        <FormLabel>Registration #</FormLabel>
                        <FormControl>
                          <Input placeholder="Medical council no" {...field} />
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
                  {isSaving && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
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
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>Member Details</DialogTitle>
            <DialogDescription>
              Edit contact details, role, verification, and signature status.
            </DialogDescription>
          </DialogHeader>
          {selectedMember && (
            <Form {...memberForm}>
              <form
                onSubmit={memberForm.handleSubmit(handleSaveMember, () => {
                  showUserFacingErrorToast(
                    "Please check the highlighted fields and try again.",
                    "Please check the highlighted fields and try again.",
                    "form",
                  );
                })}
                className="flex flex-col gap-4 text-sm"
                noValidate
              >
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <FormField
                    control={memberForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Full name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={memberForm.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="NURSE">Nurse</SelectItem>
                            <SelectItem value="RECEPTIONIST">
                              Receptionist
                            </SelectItem>
                            <SelectItem value="DOCTOR">Doctor</SelectItem>
                            <SelectItem value="ADMIN_DOCTOR">
                              Admin Doctor
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <FormField
                    control={memberForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="name@facility.com"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={memberForm.control}
                    name="phoneNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone (optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="+91..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {isSelectedMemberDoctor && (
                  <>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      <FormField
                        control={memberForm.control}
                        name="specialization"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Specialization</FormLabel>
                            <FormControl>
                              <Input placeholder="Cardiology" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={memberForm.control}
                        name="qualification"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Qualification</FormLabel>
                            <FormControl>
                              <Input placeholder="MBBS, MD" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={memberForm.control}
                        name="registrationNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Registration #</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Medical council no"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="rounded-lg border bg-surface-2 p-3">
                      <div className="flex flex-col gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            variant={getVerificationBadgeVariant(
                              selectedMember.verificationStatus,
                            )}
                          >
                            {selectedMember.verificationStatus ===
                            "VERIFIED" ? (
                              <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                            ) : (
                              <ShieldX className="mr-1 h-3.5 w-3.5" />
                            )}
                            {getVerificationBadgeLabel(
                              selectedMember.verificationStatus,
                            )}
                          </Badge>
                          <Badge
                            variant={
                              selectedMember.signatureUploadedAt
                                ? "default"
                                : "outline"
                            }
                          >
                            Signature{" "}
                            {selectedMember.signatureUploadedAt
                              ? "Ready"
                              : "Missing"}
                          </Badge>
                        </div>
                        <div className="space-y-1 text-xs text-muted-foreground">
                          <p>
                            Last verification:{" "}
                            {formatDate(selectedMember.verificationCheckedAt)}
                          </p>
                          <p>
                            Signature uploaded:{" "}
                            {formatDate(selectedMember.signatureUploadedAt)}
                          </p>
                          {selectedMember.verificationReason && (
                            <p>
                              Verification note:{" "}
                              {selectedMember.verificationReason}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleGenerateSignatureQr(selectedMember.id)
                            }
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
                            onClick={() =>
                              handleReverifyDoctor(selectedMember.id)
                            }
                            disabled={isManaging}
                          >
                            {isReverifyingDoctor && (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            Reverify Registration
                          </Button>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <p className="text-muted-foreground">Created</p>
                  <p className="font-medium">
                    {selectedMember.createdAt
                      ? new Date(selectedMember.createdAt).toLocaleDateString()
                      : "-"}
                  </p>
                </div>

                <DialogFooter className="sm:justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setSelectedMember(null)}
                    disabled={isManaging}
                    className="w-full sm:w-auto"
                  >
                    Close
                  </Button>
                  <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:justify-end">
                    <Button
                      type="submit"
                      disabled={isManaging}
                      className="w-full sm:w-auto"
                    >
                      {isUpdatingMember && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Save Changes
                    </Button>
                    <Button
                      type="button"
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
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!signatureUploadUrl}
        onOpenChange={(open) => {
          if (!open) {
            setSignatureUploadUrl(null);
            setSignatureUploadDoctorId(null);
            setSignatureUploadInitialAt(null);
          }
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
            {signatureUploadUrl ? (
              <>
                <QrCodeCard value={signatureUploadUrl} size={192} />
                <CopyableLinkField
                  value={signatureUploadUrl}
                  actionLabel="Copy Upload Link"
                  onCopy={handleCopySignatureLink}
                />
              </>
            ) : null}
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
