"use client";

import * as React from "react";
import { cn } from "@/lib/design-system";
import { Badge } from "@workspace/ui/components/badge";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import {
  User,
  Phone,
  Mail,
  Calendar,
  Droplets,
  AlertTriangle,
  Heart,
  FileText,
  MapPin,
} from "lucide-react";
import { format, differenceInYears } from "date-fns";

interface PatientData {
  id?: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: Date | string;
  gender?: string;
  phone?: string;
  email?: string;
  bloodGroup?: string;
  allergies?: string | string[];
  medicalHistory?: string | string[];
  address?: string;
  avatarUrl?: string;
}

export interface PatientBadgeProps {
  patient: PatientData;
  size?: "sm" | "md" | "lg";
  showDetails?: boolean;
  showAllergies?: boolean;
  showContact?: boolean;
  onClick?: () => void;
  className?: string;
}

/**
 * Compact patient badge with essential info
 */
export function PatientBadge({
  patient,
  size = "md",
  showDetails = false,
  showAllergies = true,
  showContact = false,
  onClick,
  className,
}: PatientBadgeProps) {
  const fullName = `${patient.firstName} ${patient.lastName}`;
  const initials =
    `${patient.firstName?.[0] ?? ""}${patient.lastName?.[0] ?? ""}`.toUpperCase();

  const age = React.useMemo(() => {
    if (!patient.dateOfBirth) return null;
    const dob =
      typeof patient.dateOfBirth === "string"
        ? new Date(patient.dateOfBirth)
        : patient.dateOfBirth;
    return differenceInYears(new Date(), dob);
  }, [patient.dateOfBirth]);

  const allergiesArray = React.useMemo(() => {
    if (!patient.allergies) return [];
    if (Array.isArray(patient.allergies)) return patient.allergies;
    return patient.allergies
      .split(",")
      .map((a) => a.trim())
      .filter(Boolean);
  }, [patient.allergies]);

  const hasAllergies = allergiesArray.length > 0;

  const sizeClasses = {
    sm: {
      container: "gap-2",
      avatar: "h-8 w-8 text-xs",
      name: "text-sm",
      details: "text-xs",
    },
    md: {
      container: "gap-3",
      avatar: "h-10 w-10 text-sm",
      name: "text-base",
      details: "text-sm",
    },
    lg: {
      container: "gap-4",
      avatar: "h-12 w-12 text-base",
      name: "text-lg",
      details: "text-sm",
    },
  };

  const sizes = sizeClasses[size];

  return (
    <TooltipProvider>
      <div
        className={cn(
          "flex items-center",
          sizes.container,
          onClick &&
            "cursor-pointer hover:bg-muted/50 rounded-lg p-2 -m-2 transition-colors",
          className,
        )}
        onClick={onClick}
      >
        <Avatar className={sizes.avatar}>
          {patient.avatarUrl && (
            <AvatarImage src={patient.avatarUrl} alt={fullName} />
          )}
          <AvatarFallback className="bg-primary/10 text-primary font-medium">
            {initials}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn("font-medium truncate", sizes.name)}>
              {fullName}
            </span>

            {showAllergies && hasAllergies && (
              <Tooltip>
                <TooltipTrigger>
                  <Badge
                    variant="destructive"
                    className="gap-1 h-5 text-[10px]"
                  >
                    <AlertTriangle className="h-3 w-3" />
                    Allergies
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="space-y-1">
                    <p className="font-medium">Known Allergies:</p>
                    <ul className="list-disc pl-4">
                      {allergiesArray.map((allergy, i) => (
                        <li key={i}>{allergy}</li>
                      ))}
                    </ul>
                  </div>
                </TooltipContent>
              </Tooltip>
            )}

            {patient.bloodGroup && (
              <Tooltip>
                <TooltipTrigger>
                  <Badge variant="outline" className="gap-1 h-5 text-[10px]">
                    <Droplets className="h-3 w-3 text-red-500" />
                    {patient.bloodGroup}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  Blood Group: {patient.bloodGroup}
                </TooltipContent>
              </Tooltip>
            )}
          </div>

          {showDetails && (
            <div
              className={cn(
                "flex items-center gap-3 text-muted-foreground mt-0.5",
                sizes.details,
              )}
            >
              {age !== null && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {age} yrs
                </span>
              )}
              {patient.gender && (
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {patient.gender}
                </span>
              )}
            </div>
          )}

          {showContact && (
            <div
              className={cn(
                "flex items-center gap-3 text-muted-foreground mt-0.5",
                sizes.details,
              )}
            >
              {patient.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {patient.phone}
                </span>
              )}
              {patient.email && (
                <span className="flex items-center gap-1 truncate">
                  <Mail className="h-3 w-3" />
                  {patient.email}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}

interface PatientCardProps {
  patient: PatientData;
  showFullDetails?: boolean;
  showMedicalHistory?: boolean;
  onEdit?: () => void;
  onViewHistory?: () => void;
  className?: string;
}

/**
 * Detailed patient info card
 */
export function PatientCard({
  patient,
  showFullDetails = true,
  showMedicalHistory = true,
  onEdit,
  onViewHistory,
  className,
}: PatientCardProps) {
  const fullName = `${patient.firstName} ${patient.lastName}`;
  const initials =
    `${patient.firstName?.[0] ?? ""}${patient.lastName?.[0] ?? ""}`.toUpperCase();

  const age = React.useMemo(() => {
    if (!patient.dateOfBirth) return null;
    const dob =
      typeof patient.dateOfBirth === "string"
        ? new Date(patient.dateOfBirth)
        : patient.dateOfBirth;
    return differenceInYears(new Date(), dob);
  }, [patient.dateOfBirth]);

  const allergiesArray = React.useMemo(() => {
    if (!patient.allergies) return [];
    if (Array.isArray(patient.allergies)) return patient.allergies;
    return patient.allergies
      .split(",")
      .map((a) => a.trim())
      .filter(Boolean);
  }, [patient.allergies]);

  const medicalHistoryArray = React.useMemo(() => {
    if (!patient.medicalHistory) return [];
    if (Array.isArray(patient.medicalHistory)) return patient.medicalHistory;
    return patient.medicalHistory
      .split(",")
      .map((a) => a.trim())
      .filter(Boolean);
  }, [patient.medicalHistory]);

  return (
    <div className={cn("rounded-lg border bg-card p-4 space-y-4", className)}>
      {/* Header */}
      <div className="flex items-start gap-4">
        <Avatar className="h-14 w-14 text-lg">
          {patient.avatarUrl && (
            <AvatarImage src={patient.avatarUrl} alt={fullName} />
          )}
          <AvatarFallback className="bg-primary/10 text-primary font-medium">
            {initials}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1">
          <h3 className="font-semibold text-lg">{fullName}</h3>
          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
            {age !== null && (
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {age} years
              </span>
            )}
            {patient.gender && (
              <span className="flex items-center gap-1">
                <User className="h-4 w-4" />
                {patient.gender}
              </span>
            )}
            {patient.bloodGroup && (
              <span className="flex items-center gap-1">
                <Droplets className="h-4 w-4 text-red-500" />
                {patient.bloodGroup}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Contact Info */}
      {showFullDetails && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          {patient.phone && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-4 w-4" />
              <span>{patient.phone}</span>
            </div>
          )}
          {patient.email && (
            <div className="flex items-center gap-2 text-muted-foreground truncate">
              <Mail className="h-4 w-4 shrink-0" />
              <span className="truncate">{patient.email}</span>
            </div>
          )}
          {patient.address && (
            <div className="flex items-start gap-2 text-muted-foreground md:col-span-2">
              <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{patient.address}</span>
            </div>
          )}
        </div>
      )}

      {/* Allergies */}
      {allergiesArray.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-destructive">
            <AlertTriangle className="h-4 w-4" />
            Allergies
          </div>
          <div className="flex flex-wrap gap-1.5">
            {allergiesArray.map((allergy, i) => (
              <Badge key={i} variant="destructive" className="text-xs">
                {allergy}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Medical History */}
      {showMedicalHistory && medicalHistoryArray.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-amber-600">
            <Heart className="h-4 w-4" />
            Medical History
          </div>
          <div className="flex flex-wrap gap-1.5">
            {medicalHistoryArray.map((condition, i) => (
              <Badge
                key={i}
                variant="outline"
                className="text-xs bg-amber-50 border-amber-200"
              >
                {condition}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      {(onEdit || onViewHistory) && (
        <div className="flex gap-2 pt-2 border-t">
          {onViewHistory && (
            <button
              onClick={onViewHistory}
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              <FileText className="h-4 w-4" />
              View History
            </button>
          )}
        </div>
      )}
    </div>
  );
}

interface PatientAvatarGroupProps {
  patients: PatientData[];
  max?: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

/**
 * Group of patient avatars with overflow count
 */
export function PatientAvatarGroup({
  patients,
  max = 4,
  size = "md",
  className,
}: PatientAvatarGroupProps) {
  const displayPatients = patients.slice(0, max);
  const overflow = patients.length - max;

  const sizeClasses = {
    sm: "h-6 w-6 text-[10px]",
    md: "h-8 w-8 text-xs",
    lg: "h-10 w-10 text-sm",
  };

  return (
    <TooltipProvider>
      <div className={cn("flex -space-x-2", className)}>
        {displayPatients.map((patient, i) => {
          const initials =
            `${patient.firstName?.[0] ?? ""}${patient.lastName?.[0] ?? ""}`.toUpperCase();
          const fullName = `${patient.firstName} ${patient.lastName}`;

          return (
            <Tooltip key={patient.id ?? i}>
              <TooltipTrigger>
                <Avatar
                  className={cn(
                    sizeClasses[size],
                    "border-2 border-background",
                  )}
                >
                  {patient.avatarUrl && (
                    <AvatarImage src={patient.avatarUrl} alt={fullName} />
                  )}
                  <AvatarFallback className="bg-primary/10 text-primary font-medium">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent>{fullName}</TooltipContent>
            </Tooltip>
          );
        })}

        {overflow > 0 && (
          <Tooltip>
            <TooltipTrigger>
              <div
                className={cn(
                  sizeClasses[size],
                  "rounded-full border-2 border-background bg-muted flex items-center justify-center font-medium",
                )}
              >
                +{overflow}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div className="space-y-1">
                {patients.slice(max).map((p, i) => (
                  <div key={i}>{`${p.firstName} ${p.lastName}`}</div>
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}

/**
 * Calculate age from date of birth
 */
export function calculateAge(dateOfBirth: Date | string): number {
  const dob =
    typeof dateOfBirth === "string" ? new Date(dateOfBirth) : dateOfBirth;
  return differenceInYears(new Date(), dob);
}

/**
 * Format date of birth with age
 */
export function formatDobWithAge(dateOfBirth: Date | string): string {
  const dob =
    typeof dateOfBirth === "string" ? new Date(dateOfBirth) : dateOfBirth;
  const age = differenceInYears(new Date(), dob);
  return `${format(dob, "MMM d, yyyy")} (${age} yrs)`;
}
