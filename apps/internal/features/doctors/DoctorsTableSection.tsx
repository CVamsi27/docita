"use client";

import { Eye, ShieldCheck, ShieldX, Stethoscope } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@workspace/ui/components/form/button";
import { Badge } from "@workspace/ui/components/indicators/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import {
  TableCell,
  TableHead,
  TableRow,
} from "@workspace/ui/components/data-display/table";
import type { InternalDoctorListItem } from "@workspace/data-access/internal";
import {
  getVerificationBadgeVariant,
  getVerificationLabel,
  labelForHospitalRole,
  labelForSpecialization,
  parseDoctorVerificationStatus,
} from "./doctor-helpers";
import { InternalTableToolbar } from "@/components/common/internal-table-toolbar";
import { TableOrEmpty } from "@/components/common/table-or-empty";

interface DoctorsTableSectionProps {
  doctors: InternalDoctorListItem[];
  clinics: { id: string; name: string }[];
  doctorSearch: string;
  selectedClinic: string;
  onDoctorSearchChange: (value: string) => void;
  onSelectedClinicChange: (value: string) => void;
  onViewDoctor: (doctor: InternalDoctorListItem) => void;
}

/**
 * Phase 3 (per-feature): apps/internal Doctors > Table section
 * (search + facility filter + doctors table). 8 literals converted
 * to useTranslations("InternalDoctors.table").
 */
function useDoctorsTableTranslations() {
  return useTranslations("InternalDoctors.table");
}

export function DoctorsTableSection({
  doctors,
  clinics,
  doctorSearch,
  selectedClinic,
  onDoctorSearchChange,
  onSelectedClinicChange,
  onViewDoctor,
}: DoctorsTableSectionProps) {
  const t = useDoctorsTableTranslations();
  return (
    <>
      <InternalTableToolbar
        searchValue={doctorSearch}
        onSearchChange={onDoctorSearchChange}
        searchPlaceholder={t("searchPlaceholder")}
        filterValue={selectedClinic}
        onFilterChange={onSelectedClinicChange}
        filterOptions={clinics.map((c) => ({
          value: c.id,
          label: c.name,
        }))}
        filterPlaceholder={t("filterPlaceholder")}
        filterAllLabel={t("filterAllLabel")}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5" />
            {t("tableTitle", { count: doctors.length })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TableOrEmpty
            items={doctors}
            emptyIcon={Stethoscope}
            emptyTitle={
              selectedClinic === "all"
                ? t("emptySelectFacilityTitle")
                : t("emptyTitle")
            }
            emptyDescription={t("emptyDescription")}
            renderHeader={() => (
              <>
                <TableHead>{t("colDoctor")}</TableHead>
                <TableHead>{t("colSpecialization")}</TableHead>
                <TableHead>{t("colCompliance")}</TableHead>
                <TableHead>{t("colHospitalRole")}</TableHead>
                <TableHead>{t("colQualification")}</TableHead>
                <TableHead>{t("colRegistration")}</TableHead>
                <TableHead>{t("colActions")}</TableHead>
              </>
            )}
            renderRow={(doctor) => (
              <TableRow key={doctor.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{t("doctorPrefix", { name: doctor.name })}</p>
                    <p className="text-sm text-muted-foreground">
                      {doctor.email}
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  {doctor.specialization ? (
                    <Badge variant="outline">
                      {labelForSpecialization(doctor.specialization) ??
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
                        parseDoctorVerificationStatus(
                          doctor.verificationStatus,
                        ),
                      )}
                    >
                      {doctor.verificationStatus === "VERIFIED" ? (
                        <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                      ) : (
                        <ShieldX className="mr-1 h-3.5 w-3.5" />
                      )}
                      {getVerificationLabel(
                        parseDoctorVerificationStatus(
                          doctor.verificationStatus,
                        ),
                      )}
                    </Badge>
                    <Badge
                      variant={
                        doctor.signatureUploadedAt ? "default" : "outline"
                      }
                    >
                      {t("signatureLabel")}{" "}
                      {doctor.signatureUploadedAt ? t("signatureReady") : t("signatureMissing")}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell>
                  {doctor.hospitalRole ? (
                    <Badge variant="secondary">
                      {labelForHospitalRole(doctor.hospitalRole) ??
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
                      onClick={() => onViewDoctor(doctor)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
          />
        </CardContent>
      </Card>
    </>
  );
}
