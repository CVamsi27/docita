"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Badge } from "@workspace/ui/components/badge";
import { EmptyState } from "@workspace/ui/components/empty-state";
import { PageHeader } from "@workspace/ui/components/page-header";
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
  Award,
  Building2,
  Eye,
  GraduationCap,
  Loader2,
  Search,
  ShieldCheck,
  ShieldX,
  Stethoscope,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { client } from "@/lib/api-client";
import { internalQueryKeys } from "@/lib/query-keys";
import { useInternalFiltersStore } from "@/lib/stores/internal-filters-store";
import { DEFAULT_CURRENCY } from "@workspace/utils";
import { showUserFacingErrorToast } from "@/lib/user-facing-errors";
import {
  getDoctorVerificationPublicNote,
  HOSPITAL_ROLE_LABELS,
  type HospitalRole,
  type Specialization,
  SPECIALIZATION_LABELS,
} from "@workspace/types";

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

  const formatDate = (value?: string) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("en-IN");
  };

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

  const doctorsQuery = useQuery({
    queryKey: ["internal", "doctors", selectedClinic || "none", clinics.length],
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
    enabled: Boolean(token && selectedClinic),
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
    setIsViewOpen(true);
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

      {}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search doctors by name, email, or specialization..."
                  value={doctorSearch}
                  onChange={(e) => setDoctorSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={selectedClinic} onValueChange={setSelectedClinic}>
              <SelectTrigger className="w-full md:w-[250px]">
                <SelectValue placeholder="Select facility" />
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

      {}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5" />
            Doctors ({filteredDoctors.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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

      {}
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
              {}
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
                    {formatDate(selectedDoctor.verificationCheckedAt)}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">
                    Signature Uploaded
                  </Label>
                  <p className="font-medium">
                    {formatDate(selectedDoctor.signatureUploadedAt)}
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
                      ? new Intl.NumberFormat("en-IN", {
                          style: "currency",
                          currency: DEFAULT_CURRENCY,
                          maximumFractionDigits: 0,
                        }).format(selectedDoctor.consultationFee)
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
                const verificationPublicNote =
                  getDoctorVerificationPublicNote(
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

              {}
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
                                  {new Date(
                                    cert.expiryDate,
                                  ).toLocaleDateString()}
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

              {}
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
