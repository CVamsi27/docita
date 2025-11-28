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
import { Textarea } from "@workspace/ui/components/textarea";
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

const SPECIALIZATIONS = Object.entries(SPECIALIZATION_LABELS).map(
  ([value, label]) => ({
    value,
    label,
  }),
);

const HOSPITAL_ROLES = Object.entries(HOSPITAL_ROLE_LABELS).map(
  ([value, label]) => ({
    value,
    label,
  }),
);

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClinic, setSelectedClinic] = useState<string>("all");
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Doctor>>({});
  const [saving, setSaving] = useState(false);
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
        setClinics(data);
        // Fetch doctors for the first clinic
        if (data.length > 0) {
          const firstClinicId = data[0].id;
          setSelectedClinic(firstClinicId);
          // Fetch doctors for first clinic
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
          } catch (error) {
            console.error("Error fetching doctors:", error);
            toast.error("Failed to load doctors");
          }
        }
      }
    } catch (error) {
      console.error("Error fetching clinics:", error);
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
      } catch (error) {
        console.error("Error fetching doctors:", error);
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

  const fetchDoctorDetails = async (doctorId: string) => {
    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/doctors/${doctorId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedDoctor(data);
        setEditForm(data);
      }
    } catch (error) {
      console.error("Error fetching doctor details:", error);
      toast.error("Failed to load doctor details");
    }
  };

  const handleViewDoctor = async (doctor: Doctor) => {
    await fetchDoctorDetails(doctor.id);
    setIsViewOpen(true);
  };

  const handleEditDoctor = async (doctor: Doctor) => {
    await fetchDoctorDetails(doctor.id);
    setIsEditOpen(true);
  };

  const handleSaveDoctor = async () => {
    if (!selectedDoctor || !token) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/doctors/${selectedDoctor.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        toast.success("Doctor updated successfully");
        setIsEditOpen(false);
        if (selectedClinic !== "all") {
          fetchDoctors(selectedClinic);
        }
      } else {
        const error = await res.json();
        toast.error(error.message || "Failed to update doctor");
      }
    } catch (error) {
      console.error("Error updating doctor:", error);
      toast.error("Error updating doctor");
    } finally {
      setSaving(false);
    }
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
            Manage doctor profiles, specializations, and credentials
          </p>
        </div>
      </div>

      {/* Filters */}
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
                {clinics.map((clinic) => (
                  <SelectItem key={clinic.id} value={clinic.id}>
                    {clinic.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Doctors Table */}
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
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditDoctor(doctor)}
                        >
                          Edit
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

      {/* View Doctor Dialog */}
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
              {/* Basic Info */}
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
                      ? `₹${selectedDoctor.consultationFee}`
                      : "-"}
                  </p>
                </div>
              </div>

              {/* Bio */}
              {selectedDoctor.bio && (
                <div>
                  <Label className="text-muted-foreground">Biography</Label>
                  <p className="mt-1">{selectedDoctor.bio}</p>
                </div>
              )}

              {/* Education History */}
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

              {/* Certifications */}
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

              {/* Additional Specializations */}
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

      {/* Edit Doctor Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Doctor Profile</DialogTitle>
            <DialogDescription>
              Update doctor information, specialization, and credentials
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={editForm.name || ""}
                  onChange={(e) =>
                    setEditForm({ ...editForm, name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={editForm.email || ""}
                  onChange={(e) =>
                    setEditForm({ ...editForm, email: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="specialization">Specialization</Label>
                <Select
                  value={editForm.specialization || ""}
                  onValueChange={(val) =>
                    setEditForm({
                      ...editForm,
                      specialization: val as Specialization,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select specialization" />
                  </SelectTrigger>
                  <SelectContent>
                    {SPECIALIZATIONS.map((spec) => (
                      <SelectItem key={spec.value} value={spec.value}>
                        {spec.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="hospitalRole">Hospital Role</Label>
                <Select
                  value={editForm.hospitalRole || ""}
                  onValueChange={(val) =>
                    setEditForm({
                      ...editForm,
                      hospitalRole: val as HospitalRole,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {HOSPITAL_ROLES.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="qualification">Qualification</Label>
                <Input
                  id="qualification"
                  placeholder="e.g., MBBS, MD, MS"
                  value={editForm.qualification || ""}
                  onChange={(e) =>
                    setEditForm({ ...editForm, qualification: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="registrationNumber">Registration Number</Label>
                <Input
                  id="registrationNumber"
                  placeholder="Medical Council Reg. No."
                  value={editForm.registrationNumber || ""}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      registrationNumber: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="licenseNumber">License Number</Label>
                <Input
                  id="licenseNumber"
                  value={editForm.licenseNumber || ""}
                  onChange={(e) =>
                    setEditForm({ ...editForm, licenseNumber: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Phone Number</Label>
                <Input
                  id="phoneNumber"
                  value={editForm.phoneNumber || ""}
                  onChange={(e) =>
                    setEditForm({ ...editForm, phoneNumber: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="yearsOfExperience">Years of Experience</Label>
                <Input
                  id="yearsOfExperience"
                  type="number"
                  value={editForm.yearsOfExperience || ""}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      yearsOfExperience: parseInt(e.target.value) || undefined,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="consultationFee">Consultation Fee (₹)</Label>
                <Input
                  id="consultationFee"
                  type="number"
                  value={editForm.consultationFee || ""}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      consultationFee: parseFloat(e.target.value) || undefined,
                    })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Biography</Label>
              <Textarea
                id="bio"
                placeholder="Short biography of the doctor..."
                value={editForm.bio || ""}
                onChange={(e) =>
                  setEditForm({ ...editForm, bio: e.target.value })
                }
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveDoctor} disabled={saving}>
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
