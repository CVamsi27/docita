"use client";

import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Card, CardContent } from "@workspace/ui/components/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
import { Plus, Trash2, Eye, EyeOff, Upload } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import {
  SPECIALIZATION_LABELS,
  HOSPITAL_ROLE_LABELS,
  type Specialization,
  type HospitalRole,
} from "@workspace/types";

// Generate options from real constants (single source of truth)
const SPECIALIZATIONS = Object.entries(SPECIALIZATION_LABELS).map(
  ([value, label]) => ({ value, label }),
);
const HOSPITAL_ROLES = Object.entries(HOSPITAL_ROLE_LABELS).map(
  ([value, label]) => ({ value, label }),
);

const QUALIFICATIONS = [
  { value: "MBBS", label: "MBBS" },
  { value: "MBChB", label: "MBChB" },
  { value: "MD", label: "MD" },
  { value: "MS", label: "MS" },
  { value: "DNB", label: "DNB" },
  { value: "DM", label: "DM" },
  { value: "MCh", label: "MCh" },
  { value: "DO", label: "DO" },
  { value: "BDS", label: "BDS" },
  { value: "MDS", label: "MDS" },
  { value: "FRCP", label: "FRCP" },
  { value: "OTHER", label: "Other" },
];

const LANGUAGES = [
  "English",
  "Hindi",
  "Telugu",
  "Tamil",
  "Kannada",
  "Malayalam",
  "Bengali",
  "Urdu",
  "Marathi",
  "Gujarati",
  "Punjabi",
  "Arabic",
  "French",
  "Spanish",
  "Chinese",
];

// Types
interface DoctorFormData {
  // Basic info
  fullName: string;
  email: string;
  phone: string;
  password?: string;

  // Professional details
  specialization: Specialization | "";
  hospitalRole: HospitalRole | "";
  qualification: string;
  registrationNo: string;
  licenseNo: string;
  yearsExperience: string;
  consultationFee: string;
  feeCurrency: string;

  bio?: string;
  languages: string[];
  profilePhotoUrl?: string;
  teleconsultEnabled: boolean;
  homeVisitAllowed: boolean;

  // Admin_Doctor permissions
  canManageStaff: boolean;
  canManageSettings: boolean;
  canManageBilling: boolean;
  canApprovePrescrip: boolean;
  isClinicOwner: boolean;

  // Consent
  consentGiven: boolean;
}

interface EducationEntry {
  id?: string;
  degree: string;
  institution: string;
  year: string;
  country: string;
  fileUrl?: string;
}

interface DoctorProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isEditing?: boolean;
  isAdminDoctor?: boolean;
  onSuccess?: () => void;
}

export function DoctorProfileModal({
  open,
  onOpenChange,
  isEditing = false,
  isAdminDoctor = false,
  onSuccess,
}: DoctorProfileModalProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [selectedTab, setSelectedTab] = useState("basic");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState<DoctorFormData>({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    specialization: "",
    hospitalRole: "",
    qualification: "",
    registrationNo: "",
    licenseNo: "",
    yearsExperience: "",
    consultationFee: "",
    feeCurrency: "INR",
    bio: "",
    languages: [],
    teleconsultEnabled: false,
    homeVisitAllowed: false,
    canManageStaff: false,
    canManageSettings: false,
    canManageBilling: false,
    canApprovePrescrip: false,
    isClinicOwner: false,
    consentGiven: false,
  });

  const [education, setEducation] = useState<EducationEntry[]>([
    { degree: "", institution: "", year: "", country: "" },
  ]);

  // Validation
  const isFormValid =
    formData.fullName &&
    formData.email &&
    formData.phone &&
    formData.specialization &&
    formData.hospitalRole &&
    formData.qualification &&
    formData.registrationNo &&
    formData.licenseNo &&
    formData.yearsExperience &&
    formData.consultationFee &&
    !isEditing &&
    formData.password &&
    education.some((e) => e.degree && e.institution && e.year) &&
    formData.consentGiven;

  const handleAddEducation = useCallback(() => {
    setEducation([
      ...education,
      { degree: "", institution: "", year: "", country: "" },
    ]);
  }, [education]);

  const handleRemoveEducation = useCallback(
    (index: number) => {
      setEducation(education.filter((_, i) => i !== index));
    },
    [education],
  );

  const handleLanguageToggle = useCallback((lang: string) => {
    setFormData((prev) => ({
      ...prev,
      languages: prev.languages.includes(lang)
        ? prev.languages.filter((l) => l !== lang)
        : [...prev.languages, lang],
    }));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isFormValid) {
      toast.error("Please fill in all required fields and accept the consent");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        education,
      };

      if (isEditing) {
        await api.put(`/doctors/profile`, payload);
        toast.success("Doctor profile updated successfully");
      } else {
        await api.post(`/doctors`, payload);
        toast.success("Doctor profile created successfully");
      }

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error saving doctor profile:", error);
      toast.error("Failed to save doctor profile");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (
    field: keyof DoctorFormData,
    value: string | number | boolean | string[],
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Doctor Profile" : "Add Doctor Profile"}
          </DialogTitle>
          <DialogDescription>
            Complete all required fields marked with{" "}
            <span className="text-destructive">*</span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Tabs
            value={selectedTab}
            onValueChange={setSelectedTab}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="professional">Professional</TabsTrigger>
              <TabsTrigger value="education">Education</TabsTrigger>
              <TabsTrigger value="additional">Additional</TabsTrigger>
            </TabsList>

            {/* BASIC INFO TAB */}
            <TabsContent value="basic" className="space-y-4">
              <Card>
                <CardContent className="pt-6 space-y-4">
                  {/* Name and Email */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fullName">
                        Full Name <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="fullName"
                        placeholder="Dr. John Doe"
                        value={formData.fullName}
                        onChange={(e) =>
                          handleInputChange("fullName", e.target.value)
                        }
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        As it should appear on prescriptions
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">
                        Email <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="doctor@clinic.com"
                        value={formData.email}
                        onChange={(e) =>
                          handleInputChange(
                            "email",
                            e.target.value.toLowerCase(),
                          )
                        }
                        required
                      />
                    </div>
                  </div>

                  {/* Phone */}
                  <div className="space-y-2">
                    <Label htmlFor="phone">
                      Phone <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="phone"
                      placeholder="+91 98765 43210"
                      value={formData.phone}
                      onChange={(e) =>
                        handleInputChange("phone", e.target.value)
                      }
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      International format (e.g., +91...)
                    </p>
                  </div>

                  {/* Password (only on create) */}
                  {!isEditing && (
                    <div className="space-y-2">
                      <Label htmlFor="password">
                        Password <span className="text-destructive">*</span>
                      </Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter strong password"
                          value={formData.password || ""}
                          onChange={(e) =>
                            handleInputChange("password", e.target.value)
                          }
                          required={!isEditing}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* PROFESSIONAL TAB */}
            <TabsContent value="professional" className="space-y-4">
              <Card>
                <CardContent className="pt-6 space-y-4">
                  {/* Specialization and Hospital Role */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="specialization">
                        Specialization{" "}
                        <span className="text-destructive">*</span>
                      </Label>
                      <Select
                        value={formData.specialization}
                        onValueChange={(value) =>
                          handleInputChange("specialization", value)
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
                      <Label htmlFor="hospitalRole">
                        Hospital Role{" "}
                        <span className="text-destructive">*</span>
                      </Label>
                      <Select
                        value={formData.hospitalRole}
                        onValueChange={(value) =>
                          handleInputChange("hospitalRole", value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select hospital role" />
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

                  {/* Qualification and Registration */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="qualification">
                        Qualification{" "}
                        <span className="text-destructive">*</span>
                      </Label>
                      <Select
                        value={formData.qualification}
                        onValueChange={(value) =>
                          handleInputChange("qualification", value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select qualification" />
                        </SelectTrigger>
                        <SelectContent>
                          {QUALIFICATIONS.map((qual) => (
                            <SelectItem key={qual.value} value={qual.value}>
                              {qual.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="registrationNo">
                        Registration Number{" "}
                        <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="registrationNo"
                        placeholder="e.g., MCI-12345"
                        value={formData.registrationNo}
                        onChange={(e) =>
                          handleInputChange("registrationNo", e.target.value)
                        }
                        required
                      />
                    </div>
                  </div>

                  {/* License and Years Experience */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="licenseNo">
                        License Number{" "}
                        <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="licenseNo"
                        placeholder="e.g., LIC-98765"
                        value={formData.licenseNo}
                        onChange={(e) =>
                          handleInputChange("licenseNo", e.target.value)
                        }
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="yearsExperience">
                        Years of Experience{" "}
                        <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="yearsExperience"
                        type="number"
                        min="0"
                        max="60"
                        placeholder="e.g., 10"
                        value={formData.yearsExperience}
                        onChange={(e) =>
                          handleInputChange("yearsExperience", e.target.value)
                        }
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        Total years since degree completion
                      </p>
                    </div>
                  </div>

                  {/* Consultation Fee */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="consultationFee">
                        Consultation Fee{" "}
                        <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="consultationFee"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="500"
                        value={formData.consultationFee}
                        onChange={(e) =>
                          handleInputChange("consultationFee", e.target.value)
                        }
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="feeCurrency">Currency</Label>
                      <Select
                        value={formData.feeCurrency}
                        onValueChange={(value) =>
                          handleInputChange("feeCurrency", value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="INR">INR (₹)</SelectItem>
                          <SelectItem value="USD">USD ($)</SelectItem>
                          <SelectItem value="EUR">EUR (€)</SelectItem>
                          <SelectItem value="GBP">GBP (£)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-end">
                      <div className="p-3 bg-muted rounded-md w-full">
                        <p className="text-sm font-medium">
                          {formData.feeCurrency}{" "}
                          {formData.consultationFee || "0"}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* EDUCATION TAB */}
            <TabsContent value="education" className="space-y-4">
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">
                      Education History{" "}
                      <span className="text-destructive">*</span>
                    </h3>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddEducation}
                      className="gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Add Entry
                    </Button>
                  </div>

                  {education.map((entry, index) => (
                    <div
                      key={index}
                      className="p-4 border rounded-lg space-y-4"
                    >
                      <div className="flex justify-between items-start">
                        <h4 className="font-medium">Entry {index + 1}</h4>
                        {education.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveEducation(index)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Degree</Label>
                          <Select
                            value={entry.degree}
                            onValueChange={(value) => {
                              const newEducation = [...education];
                              const entry = newEducation[index];
                              if (entry) {
                                entry.degree = value;
                                setEducation(newEducation);
                              }
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select degree" />
                            </SelectTrigger>
                            <SelectContent>
                              {QUALIFICATIONS.map((qual) => (
                                <SelectItem key={qual.value} value={qual.value}>
                                  {qual.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Institution</Label>
                          <Input
                            placeholder="e.g., Government Medical College"
                            value={entry.institution}
                            onChange={(e) => {
                              const newEducation = [...education];
                              const currentEntry = newEducation[index];
                              if (currentEntry) {
                                currentEntry.institution = e.target.value;
                                setEducation(newEducation);
                              }
                            }}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Year of Completion</Label>
                          <Input
                            type="number"
                            min="1900"
                            max={new Date().getFullYear()}
                            placeholder={new Date().getFullYear().toString()}
                            value={entry.year}
                            onChange={(e) => {
                              const newEducation = [...education];
                              const currentEntry = newEducation[index];
                              if (currentEntry) {
                                currentEntry.year = e.target.value;
                                setEducation(newEducation);
                              }
                            }}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Country</Label>
                          <Input
                            placeholder="e.g., India"
                            value={entry.country}
                            onChange={(e) => {
                              const newEducation = [...education];
                              const currentEntry = newEducation[index];
                              if (currentEntry) {
                                currentEntry.country = e.target.value;
                                setEducation(newEducation);
                              }
                            }}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Upload Certificate (Optional)</Label>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="gap-2"
                          >
                            <Upload className="h-4 w-4" />
                            Upload
                          </Button>
                          {entry.fileUrl && (
                            <span className="text-xs text-green-600 flex items-center gap-1">
                              ✓ Uploaded
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  <p className="text-xs text-muted-foreground mt-4">
                    At least one education entry is required
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ADDITIONAL TAB */}
            <TabsContent value="additional" className="space-y-4">
              <Card>
                <CardContent className="pt-6 space-y-6">
                  {/* Languages */}
                  <div className="space-y-3">
                    <Label>Languages Spoken</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {LANGUAGES.map((lang) => (
                        <div key={lang} className="flex items-center gap-2">
                          <Checkbox
                            id={`lang-${lang}`}
                            checked={formData.languages.includes(lang)}
                            onCheckedChange={() => handleLanguageToggle(lang)}
                          />
                          <label
                            htmlFor={`lang-${lang}`}
                            className="text-sm cursor-pointer"
                          >
                            {lang}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Bio */}
                  <div className="space-y-2">
                    <Label htmlFor="bio">Short Biography (Optional)</Label>
                    <Textarea
                      id="bio"
                      placeholder="Brief professional background..."
                      value={formData.bio}
                      onChange={(e) => handleInputChange("bio", e.target.value)}
                      maxLength={1000}
                      rows={4}
                    />
                    <p className="text-xs text-muted-foreground">
                      {(formData.bio || "").length}/1000 characters
                    </p>
                  </div>

                  {/* Service Availability */}
                  <div className="space-y-3">
                    <Label>Service Availability</Label>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="teleconsult"
                          checked={formData.teleconsultEnabled}
                          onCheckedChange={(checked) =>
                            handleInputChange("teleconsultEnabled", checked)
                          }
                        />
                        <label
                          htmlFor="teleconsult"
                          className="text-sm cursor-pointer"
                        >
                          Available for Teleconsultations
                        </label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="homevisit"
                          checked={formData.homeVisitAllowed}
                          onCheckedChange={(checked) =>
                            handleInputChange("homeVisitAllowed", checked)
                          }
                        />
                        <label
                          htmlFor="homevisit"
                          className="text-sm cursor-pointer"
                        >
                          Available for Home Visits
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Admin Doctor Permissions (only if isAdminDoctor or creating admin doctor) */}
                  {isAdminDoctor && (
                    <div className="space-y-3 pt-4 border-t">
                      <Label className="font-semibold">Admin Permissions</Label>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="manageStaff"
                            checked={formData.canManageStaff}
                            onCheckedChange={(checked) =>
                              handleInputChange("canManageStaff", checked)
                            }
                          />
                          <label
                            htmlFor="manageStaff"
                            className="text-sm cursor-pointer"
                          >
                            Can Manage Staff
                          </label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="manageSettings"
                            checked={formData.canManageSettings}
                            onCheckedChange={(checked) =>
                              handleInputChange("canManageSettings", checked)
                            }
                          />
                          <label
                            htmlFor="manageSettings"
                            className="text-sm cursor-pointer"
                          >
                            Can Manage Settings
                          </label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="manageBilling"
                            checked={formData.canManageBilling}
                            onCheckedChange={(checked) =>
                              handleInputChange("canManageBilling", checked)
                            }
                          />
                          <label
                            htmlFor="manageBilling"
                            className="text-sm cursor-pointer"
                          >
                            Can Manage Billing
                          </label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="approvePrescrip"
                            checked={formData.canApprovePrescrip}
                            onCheckedChange={(checked) =>
                              handleInputChange("canApprovePrescrip", checked)
                            }
                          />
                          <label
                            htmlFor="approvePrescrip"
                            className="text-sm cursor-pointer"
                          >
                            Can Approve Prescriptions
                          </label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="clinicOwner"
                            checked={formData.isClinicOwner}
                            onCheckedChange={(checked) =>
                              handleInputChange("isClinicOwner", checked)
                            }
                          />
                          <label
                            htmlFor="clinicOwner"
                            className="text-sm cursor-pointer"
                          >
                            Is Clinic Owner
                          </label>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Consent */}
                  <div className="space-y-3 pt-4 border-t">
                    <div className="flex items-start gap-2">
                      <Checkbox
                        id="consent"
                        checked={formData.consentGiven}
                        onCheckedChange={(checked) =>
                          handleInputChange("consentGiven", checked)
                        }
                      />
                      <label
                        htmlFor="consent"
                        className="text-sm cursor-pointer leading-relaxed"
                      >
                        I confirm that the information and documents provided
                        are accurate and I authorize this clinic to store and
                        process my professional data. I understand this data
                        will be kept confidential and used only for clinic
                        operations.
                      </label>
                    </div>
                    {!formData.consentGiven && (
                      <p className="text-xs text-destructive">
                        You must accept the consent to proceed
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!isFormValid || isSubmitting}
              className="gap-2"
            >
              {isSubmitting
                ? "Saving..."
                : isEditing
                  ? "Update Profile"
                  : "Create Profile"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
