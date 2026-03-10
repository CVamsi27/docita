"use client";

import { useState, useEffect, useCallback } from "react";
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
  Loader2,
  Search,
  Eye,
  GraduationCap,
  Award,
  Stethoscope,
  Building2,
} from "lucide-react";
import { API_URL } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { DEFAULT_CURRENCY } from "@workspace/utils";
import {
  SPECIALIZATION_LABELS,
  HOSPITAL_ROLE_LABELS,
  type Specialization,
  type HospitalRole,
} from "@workspace/types";

interface Doctor {
  id: string;
  name: string;
  email: string;
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

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClinic, setSelectedClinic] = useState<string>("all");
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const { token } = useAuth();

  const fetchClinics = useCallback(async () => {
    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/super-admin/clinics`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();

        const clinicsArray = Array.isArray(data) ? data : [];
        setClinics(clinicsArray);

        if (clinicsArray.length > 0) {
          const firstClinicId = clinicsArray[0].id;
          setSelectedClinic(firstClinicId);

          try {
            const doctorsRes = await fetch(
              `${API_URL}/super-admin/clinics/${firstClinicId}/doctors`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              },
            );
            if (doctorsRes.ok) {
              const doctorsData = await doctorsRes.json();
              setDoctors(doctorsData);
            }
          } catch {

            toast.error("Failed to load doctors");
          }
        }
      }
    } catch {

      toast.error("Failed to load clinics");
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchDoctors = useCallback(
    async (clinicId: string) => {
      if (!token) return;

      setLoading(true);
      try {
        const res = await fetch(
          `${API_URL}/super-admin/clinics/${clinicId}/doctors`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );
        if (res.ok) {
          const data = await res.json();
          setDoctors(data);
        }
      } catch {

        toast.error("Failed to load doctors");
      } finally {
        setLoading(false);
      }
    },
    [token],
  );

  useEffect(() => {
    fetchClinics();
  }, [fetchClinics]);

  useEffect(() => {
    if (selectedClinic && selectedClinic !== "all") {
      fetchDoctors(selectedClinic);
    }
  }, [selectedClinic, fetchDoctors]);

  const fetchDoctorDetails = async (clinicId: string, doctorId: string) => {
    if (!token) return;

    try {
      const res = await fetch(
        `${API_URL}/super-admin/clinics/${clinicId}/doctors/${doctorId}`,
        {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      );
      if (res.ok) {
        const data = await res.json();
        setSelectedDoctor(data);
      }
    } catch {

      toast.error("Failed to load doctor details");
    }
  };

  const handleViewDoctor = async (doctor: Doctor) => {
    if (!selectedClinic || selectedClinic === "all") {
      toast.error("Select a clinic to load doctor details");
      return;
    }

    await fetchDoctorDetails(selectedClinic, doctor.id);
    setIsViewOpen(true);
  };

  const filteredDoctors = doctors.filter(
    (doctor) =>
      doctor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doctor.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (doctor.specialization &&
        SPECIALIZATION_LABELS[doctor.specialization]
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase())),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Doctors</h1>
          <p className="text-muted-foreground">
            Monitor doctor profiles, specializations, and credentials
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
                  placeholder="Search doctors by name, email, or specialization..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={selectedClinic} onValueChange={setSelectedClinic}>
              <SelectTrigger className="w-full md:w-[250px]">
                <SelectValue placeholder="Select clinic" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Clinics</SelectItem>
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
            <div className="text-center py-8 text-muted-foreground">
              {selectedClinic === "all"
                ? "Select a clinic to view doctors"
                : "No doctors found"}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Doctor</TableHead>
                  <TableHead>Specialization</TableHead>
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

              {}
              {selectedDoctor.bio && (
                <div>
                  <Label className="text-muted-foreground">Biography</Label>
                  <p className="mt-1">{selectedDoctor.bio}</p>
                </div>
              )}

              {}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <GraduationCap className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Education History</h3>
                </div>
                {selectedDoctor.educationHistory &&
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
                {selectedDoctor.certifications &&
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
              {selectedDoctor.additionalSpecializations &&
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
