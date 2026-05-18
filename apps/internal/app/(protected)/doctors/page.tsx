"use client";

import { DEFAULT_CURRENCY, formatCurrency, getDoctorVerificationPublicNote } from "@workspace/utils";

import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";

import { useEffect, useMemo, useState } from "react";
import { useInternalQuery } from "@/lib/api/use-internal-query";
import { Button } from "@workspace/ui/components/form/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { Input } from "@workspace/ui/components/form/input";
import { Badge } from "@workspace/ui/components/indicators/badge";
import { EmptyState } from "@workspace/ui/components/feedback/empty-state";
import { PageHeader } from "@workspace/ui/components/layout/page-header";
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
import { Textarea } from "@workspace/ui/components/form/textarea";
import {
  Award,
  Building2,
  Eye,
  FileText,
  GraduationCap,
  Search,
  ShieldCheck,
  ShieldX,
  Stethoscope,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth/auth";
import { client } from "@/lib/api/api-client";
import { formatInternalListDate } from "@/lib/formatters/format-display-date";
import { internalQueryKeys } from "@/lib/api/query-keys";
import { useInternalFiltersStore } from "@/lib/stores/internal-filters-store";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import { HOSPITAL_ROLE_LABELS, type HospitalRole, type Specialization, SPECIALIZATION_LABELS } from "@workspace/types";

interface Doctor {
  id: string;
  name: string;
  email: string;
  clinicId?: string;
  specialization?: Specialization;
  hospitalRole?: HospitalRole;
  qualification?: string;
  registrationNumber?: string;
  licenseNumber?: string;
  phoneNumber?: string;
  bio?: string;
  yearsOfExperience?: number;
  consultationFee?: number;
  profilePhotoUrl?: string;
  signatureUrl?: string;
  signatureUploadedAt?: string;
  verificationStatus?:
    | "UNVERIFIED"
    | "PENDING"
    | "VERIFIED"
    | "REJECTED"
    | "FAILED";
  verificationReason?: string;
  verificationCheckedAt?: string;
  verificationSource?: string;
  registrationCouncil?: string;
  registrationStateCode?: string;
  registrationCertificateUrl?: string | null;
  verifiedByAdminId?: string | null;
  verifiedByAdminAt?: string | null;
  createdAt: string;
  educationHistory?: Education[];
  certifications?: Certification[];
  additionalSpecializations?: DoctorSpecializationEntry[];
}

interface Education {
  id: string;
  degree: string;
  fieldOfStudy?: string;
  institution: string;
  location?: string;
  startYear?: number;
  endYear?: number;
  isOngoing: boolean;
  grade?: string;
}

interface Certification {
  id: string;
  name: string;
  issuingBody: string;
  issueDate: string;
  expiryDate?: string;
  credentialId?: string;
}

interface DoctorSpecializationEntry {
  id: string;
  specialization: Specialization;
  isPrimary: boolean;
  yearsOfPractice?: number;
}

interface Clinic {
  id: string;
  name: string;
}
const EMPTY_CLINICS: Clinic[] = [];

export default function DoctorsPage() {
  const { doctorSearch, selectedClinic, setDoctorSearch, setSelectedClinic } =
    useInternalFiltersStore();
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [adminActionBusy, setAdminActionBusy] = useState<
    "verify" | "reject" | null
  >(null);
  const [rejectionReasonDraft, setRejectionReasonDraft] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const { token } = useAuth();

  const getVerificationBadgeVariant = (
    status?: Doctor["verificationStatus"],
  ): "default" | "secondary" | "destructive" | "outline" => {
    if (status === "VERIFIED") return "default";
    if (status === "FAILED" || status === "REJECTED") return "destructive";
    if (status === "PENDING") return "secondary";
    return "outline";
  };

  const getVerificationLabel = (status?: Doctor["verificationStatus"]) => {
    if (!status) return "Unverified";
    return status.charAt(0) + status.slice(1).toLowerCase();
  };

  const clinicsQuery = useInternalQuery({
    queryKey: internalQueryKeys.internal.clinics(),
    queryFn: async () => {
      const data = await client.get<Clinic[] | { items?: Clinic[] }>(
        "/internal/clinics",
      );
      return Array.isArray(data) ? data : (data.items ?? []);
    },
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

  const doctorsQuery = useInternalQuery({
    queryKey: [
      "internal",
      "doctors",
      selectedClinic || "none",
      clinics.length,
    ] as const,
    queryFn: async () => {
      if (selectedClinic === "all") {
        const allDoctorsArrays = await Promise.all(
          clinics.map(async (clinic) => {
            const clinicDoctors = await client.get<Doctor[]>(
              `/internal/clinics/${clinic.id}/doctors`,
            );
            return (clinicDoctors ?? []).map((doctor) => ({
              ...doctor,
              clinicId: clinic.id,
            }));
          }),
        );
        return allDoctorsArrays.flat();
      }

      if (!selectedClinic) return [];
      const data = await client.get<Doctor[]>(
        `/internal/clinics/${selectedClinic}/doctors`,
      );
      return Array.isArray(data) ? data : [];
    },
    enabled: Boolean(selectedClinic),
  });
  const doctors = doctorsQuery.data ?? [];
  const loading = clinicsQuery.isLoading || doctorsQuery.isLoading;

  const fetchDoctorDetails = async (clinicId: string, doctorId: string) => {
    if (!token) return;

    try {
      const data = await client.get<Doctor>(
        `/internal/clinics/${clinicId}/doctors/${doctorId}`,
      );
      setSelectedDoctor(data);
    } catch {
      showUserFacingErrorToast(
        "We could not load these doctor details. Please try again.",
      );
    }
  };

  const handleViewDoctor = async (doctor: Doctor) => {
    const clinicId =
      doctor.clinicId || (selectedClinic !== "all" ? selectedClinic : "");

    if (!clinicId) {
      showUserFacingErrorToast("Choose a clinic before opening doctor details");
      return;
    }

    await fetchDoctorDetails(clinicId, doctor.id);
    setShowRejectForm(false);
    setRejectionReasonDraft("");
    setIsViewOpen(true);
  };

  const refreshSelectedDoctor = async (doctorId: string) => {
    const clinicId = selectedDoctor?.clinicId;
    if (clinicId) {
      await fetchDoctorDetails(clinicId, doctorId);
    }
    await doctorsQuery.refetch();
  };

  const handleAdminVerify = async () => {
    if (!selectedDoctor) return;
    setAdminActionBusy("verify");
    try {
      await client.post(
        `/internal/doctors/${selectedDoctor.id}/admin-verify`,
        {},
      );
      toast.success("Doctor verified");
      await refreshSelectedDoctor(selectedDoctor.id);
      setShowRejectForm(false);
    } catch (error) {
      showUserFacingErrorToast(
        error,
        "We could not verify this doctor. Please try again.",
        "verification",
      );
    } finally {
      setAdminActionBusy(null);
    }
  };

  const handleAdminReject = async () => {
    if (!selectedDoctor) return;
    const reason = rejectionReasonDraft.trim();
    if (reason.length < 3) {
      showUserFacingErrorToast(
        null,
        "Enter a rejection reason before continuing.",
        "form",
      );
      return;
    }
    setAdminActionBusy("reject");
    try {
      await client.post(`/internal/doctors/${selectedDoctor.id}/admin-reject`, {
        reason,
      });
      toast.success("Doctor rejected with reason");
      await refreshSelectedDoctor(selectedDoctor.id);
      setShowRejectForm(false);
      setRejectionReasonDraft("");
    } catch (error) {
      showUserFacingErrorToast(
        error,
        "We could not reject this doctor. Please try again.",
        "verification",
      );
    } finally {
      setAdminActionBusy(null);
    }
  };

  const filteredDoctors = doctors.filter(
    (doctor) =>
      doctor.name.toLowerCase().includes(doctorSearch.toLowerCase()) ||
      doctor.email.toLowerCase().includes(doctorSearch.toLowerCase()) ||
      (doctor.specialization &&
        SPECIALIZATION_LABELS[doctor.specialization]
          ?.toLowerCase()
          .includes(doctorSearch.toLowerCase())),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Doctors"
        description="Monitor doctor profiles, specializations, and credentials"
        size="compact"
      />

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Enter name, email, or specialization"
                  value={doctorSearch}
                  onChange={(e) => setDoctorSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={selectedClinic} onValueChange={setSelectedClinic}>
              <SelectTrigger className="w-full md:w-[250px]">
                <SelectValue placeholder="Facility" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Facilities</SelectItem>
                {Array.isArray(clinics) &&
                  clinics.map((clinic) => (
                    <SelectItem key={clinic.id} value={clinic.id}>
                      {clinic.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5" />
            Doctors ({filteredDoctors.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div
              className="flex items-center justify-center py-8"
              role="status"
              aria-live="polite"
              aria-label="Loading doctors"
            >
              <DocitaLoadingIndicator
                variant="section"
                withStatusRole={false}
                iconClassName="h-8 w-8 text-muted-foreground"
              />
            </div>
          ) : filteredDoctors.length === 0 ? (
            <EmptyState
              icon={Stethoscope}
              title={
                selectedClinic === "all"
                  ? "Select a facility to view doctors"
                  : "No doctors found"
              }
              description="Doctors matching the selected facility and search query will appear here."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Doctor</TableHead>
                  <TableHead>Specialization</TableHead>
                  <TableHead>Compliance</TableHead>
                  <TableHead>Hospital Role</TableHead>
                  <TableHead>Qualification</TableHead>
                  <TableHead>Registration</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDoctors.map((doctor) => (
                  <TableRow key={doctor.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">Dr. {doctor.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {doctor.email}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {doctor.specialization ? (
                        <Badge variant="outline">
                          {SPECIALIZATION_LABELS[doctor.specialization] ||
                            doctor.specialization}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Badge
                          variant={getVerificationBadgeVariant(
                            doctor.verificationStatus,
                          )}
                        >
                          {doctor.verificationStatus === "VERIFIED" ? (
                            <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                          ) : (
                            <ShieldX className="mr-1 h-3.5 w-3.5" />
                          )}
                          {getVerificationLabel(doctor.verificationStatus)}
                        </Badge>
                        <Badge
                          variant={
                            doctor.signatureUploadedAt ? "default" : "outline"
                          }
                        >
                          Signature{" "}
                          {doctor.signatureUploadedAt ? "Ready" : "Missing"}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      {doctor.hospitalRole ? (
                        <Badge variant="secondary">
                          {HOSPITAL_ROLE_LABELS[doctor.hospitalRole] ||
                            doctor.hospitalRole}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {doctor.qualification || (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {doctor.registrationNumber || (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDoctor(doctor)}
                        >
                          <Eye className="h-4 w-4" />
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

      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Stethoscope className="h-5 w-5" />
              Dr. {selectedDoctor?.name}
            </DialogTitle>
            <DialogDescription>
              Complete doctor profile and credentials
            </DialogDescription>
          </DialogHeader>

          {selectedDoctor && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Email</Label>
                  <p className="font-medium">{selectedDoctor.email}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Phone</Label>
                  <p className="font-medium">
                    {selectedDoctor.phoneNumber || "-"}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">
                    Specialization
                  </Label>
                  <p className="font-medium">
                    {selectedDoctor.specialization
                      ? SPECIALIZATION_LABELS[selectedDoctor.specialization]
                      : "-"}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Hospital Role</Label>
                  <p className="font-medium">
                    {selectedDoctor.hospitalRole
                      ? HOSPITAL_ROLE_LABELS[selectedDoctor.hospitalRole]
                      : "-"}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Qualification</Label>
                  <p className="font-medium">
                    {selectedDoctor.qualification || "-"}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">
                    Registration Number
                  </Label>
                  <p className="font-medium">
                    {selectedDoctor.registrationNumber || "-"}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">
                    License Number
                  </Label>
                  <p className="font-medium">
                    {selectedDoctor.licenseNumber || "-"}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Verification</Label>
                  <p className="font-medium">
                    {getVerificationLabel(selectedDoctor.verificationStatus)}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">
                    Last Verification
                  </Label>
                  <p className="font-medium">
                    {formatInternalListDate(
                      selectedDoctor.verificationCheckedAt,
                    )}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">
                    Signature Uploaded
                  </Label>
                  <p className="font-medium">
                    {formatInternalListDate(selectedDoctor.signatureUploadedAt)}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">
                    Years of Experience
                  </Label>
                  <p className="font-medium">
                    {selectedDoctor.yearsOfExperience
                      ? `${selectedDoctor.yearsOfExperience} years`
                      : "-"}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">
                    Consultation Fee
                  </Label>
                  <p className="font-medium">
                    {selectedDoctor.consultationFee
                      ? formatCurrency(selectedDoctor.consultationFee, {
                          currency: DEFAULT_CURRENCY,
                          fractionDigits: 0,
                        })
                      : "-"}
                  </p>
                </div>
              </div>

              {selectedDoctor.bio && (
                <div>
                  <Label className="text-muted-foreground">Biography</Label>
                  <p className="mt-1">{selectedDoctor.bio}</p>
                </div>
              )}

              {(() => {
                const verificationPublicNote = getDoctorVerificationPublicNote(
                  selectedDoctor.verificationStatus,
                  selectedDoctor.verificationReason,
                );
                if (!verificationPublicNote) return null;
                return (
                  <div>
                    <Label className="text-muted-foreground">
                      Verification note
                    </Label>
                    <p className="mt-1">{verificationPublicNote}</p>
                  </div>
                );
              })()}

              {(selectedDoctor.registrationCouncil ||
                selectedDoctor.registrationStateCode ||
                selectedDoctor.registrationCertificateUrl) && (
                <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                  <Label className="text-muted-foreground text-xs uppercase tracking-wide">
                    Registration evidence
                  </Label>
                  {(selectedDoctor.registrationCouncil ||
                    selectedDoctor.registrationStateCode) && (
                    <p className="text-sm">
                      {selectedDoctor.registrationCouncil && (
                        <>
                          Issuing council:{" "}
                          <span className="font-medium">
                            {selectedDoctor.registrationCouncil}
                          </span>
                        </>
                      )}
                      {selectedDoctor.registrationStateCode && (
                        <>
                          {selectedDoctor.registrationCouncil ? " · " : null}
                          Region:{" "}
                          <span className="font-medium">
                            {selectedDoctor.registrationStateCode}
                          </span>
                        </>
                      )}
                    </p>
                  )}
                  {selectedDoctor.registrationCertificateUrl ? (
                    <a
                      href={selectedDoctor.registrationCertificateUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      <FileText className="h-4 w-4" />
                      View uploaded registration certificate
                    </a>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      No registration certificate uploaded.
                    </p>
                  )}
                </div>
              )}

              {selectedDoctor.registrationNumber &&
                (selectedDoctor.verificationStatus === "PENDING" ||
                  selectedDoctor.verificationStatus === "FAILED" ||
                  selectedDoctor.verificationStatus === "UNVERIFIED") && (
                  <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
                    <div>
                      <Label className="text-sm font-semibold">
                        Admin review
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Confirm this doctor&apos;s registration against the
                        council portal or the uploaded certificate, then verify
                        or reject with a reason.
                      </p>
                    </div>

                    {!showRejectForm ? (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          onClick={handleAdminVerify}
                          disabled={adminActionBusy !== null}
                        >
                          <ShieldCheck className="mr-2 h-4 w-4" />
                          {adminActionBusy === "verify"
                            ? "Verifying…"
                            : "Verify Doctor"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setShowRejectForm(true)}
                          disabled={adminActionBusy !== null}
                        >
                          <ShieldX className="mr-2 h-4 w-4" />
                          Reject
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label
                          htmlFor="reject-reason"
                          className="text-xs text-muted-foreground"
                        >
                          Rejection reason (visible to the doctor)
                        </Label>
                        <Textarea
                          id="reject-reason"
                          value={rejectionReasonDraft}
                          onChange={(e) =>
                            setRejectionReasonDraft(e.target.value)
                          }
                          placeholder="e.g. Registration number not found on the Maharashtra Medical Council portal. Please re-check the number and resubmit."
                          rows={3}
                          maxLength={500}
                        />
                        <div className="flex flex-wrap gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setShowRejectForm(false);
                              setRejectionReasonDraft("");
                            }}
                            disabled={adminActionBusy !== null}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={handleAdminReject}
                            disabled={adminActionBusy !== null}
                          >
                            {adminActionBusy === "reject"
                              ? "Rejecting…"
                              : "Submit Rejection"}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <GraduationCap className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Education History</h3>
                </div>
                {Array.isArray(selectedDoctor.educationHistory) &&
                selectedDoctor.educationHistory.length > 0 ? (
                  <div className="space-y-3">
                    {selectedDoctor.educationHistory.map((edu) => (
                      <Card key={edu.id}>
                        <CardContent className="pt-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium">{edu.degree}</p>
                              {edu.fieldOfStudy && (
                                <p className="text-sm text-muted-foreground">
                                  {edu.fieldOfStudy}
                                </p>
                              )}
                              <p className="text-sm">{edu.institution}</p>
                              {edu.location && (
                                <p className="text-sm text-muted-foreground">
                                  {edu.location}
                                </p>
                              )}
                            </div>
                            <Badge variant="outline">
                              {edu.startYear && `${edu.startYear} - `}
                              {edu.isOngoing ? "Present" : edu.endYear}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">
                    No education history added
                  </p>
                )}
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Award className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Certifications</h3>
                </div>
                {Array.isArray(selectedDoctor.certifications) &&
                selectedDoctor.certifications.length > 0 ? (
                  <div className="space-y-3">
                    {selectedDoctor.certifications.map((cert) => (
                      <Card key={cert.id}>
                        <CardContent className="pt-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium">{cert.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {cert.issuingBody}
                              </p>
                              {cert.credentialId && (
                                <p className="text-xs text-muted-foreground">
                                  ID: {cert.credentialId}
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              <Badge variant="outline">
                                {new Date(cert.issueDate).getFullYear()}
                              </Badge>
                              {cert.expiryDate && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Expires:{" "}
                                  {formatInternalListDate(cert.expiryDate)}
                                </p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">
                    No certifications added
                  </p>
                )}
              </div>

              {Array.isArray(selectedDoctor.additionalSpecializations) &&
                selectedDoctor.additionalSpecializations.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Building2 className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold">
                        Additional Specializations
                      </h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedDoctor.additionalSpecializations.map((spec) => (
                        <Badge
                          key={spec.id}
                          variant={spec.isPrimary ? "default" : "outline"}
                        >
                          {SPECIALIZATION_LABELS[spec.specialization]}
                          {spec.yearsOfPractice &&
                            ` (${spec.yearsOfPractice}y)`}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
