"use client";

import { Eye, Search, ShieldCheck, ShieldX, Stethoscope } from "lucide-react";
import { Button } from "@workspace/ui/components/form/button";
import { Input } from "@workspace/ui/components/form/input";
import { Badge } from "@workspace/ui/components/indicators/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { EmptyState } from "@workspace/ui/components/feedback/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/form/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
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

interface DoctorsTableSectionProps {
  doctors: InternalDoctorListItem[];
  clinics: { id: string; name: string }[];
  doctorSearch: string;
  selectedClinic: string;
  onDoctorSearchChange: (value: string) => void;
  onSelectedClinicChange: (value: string) => void;
  onViewDoctor: (doctor: InternalDoctorListItem) => void;
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
  return (
    <>
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Enter name, email, or specialization"
                  value={doctorSearch}
                  onChange={(e) => onDoctorSearchChange(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select
              value={selectedClinic}
              onValueChange={onSelectedClinicChange}
            >
              <SelectTrigger className="w-full md:w-[250px]">
                <SelectValue placeholder="Facility" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All facilities</SelectItem>
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
            Doctors ({doctors.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {doctors.length === 0 ? (
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
                  <TableHead>Hospital role</TableHead>
                  <TableHead>Qualification</TableHead>
                  <TableHead>Registration</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {doctors.map((doctor) => (
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
                          Signature{" "}
                          {doctor.signatureUploadedAt ? "Ready" : "Missing"}
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
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}
