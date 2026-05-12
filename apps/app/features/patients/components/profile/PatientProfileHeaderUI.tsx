import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Calendar, Edit, Mail, MapPin, Phone, Shield } from "lucide-react";
import { formatDate } from "@workspace/utils";
import { formatGenderLabel } from "@/lib/formatters";

interface PatientProfileHeaderUIProps {
  firstName: string;
  lastName: string;
  initials: string;
  age: string | number;
  gender: string;
  dateOfBirth?: Date | string;
  patientId: string;
  email?: string;
  phoneNumber?: string;
  address?: string;
  onEdit?: () => void;
}

export function PatientProfileHeaderUI({
  firstName,
  lastName,
  initials,
  age,
  gender,
  dateOfBirth,
  patientId,
  email,
  phoneNumber,
  address,
  onEdit,
}: PatientProfileHeaderUIProps) {
  return (
    <div className="ui-card-surface p-4 sm:p-6 md:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between md:gap-6">
        <div className="flex flex-col items-center md:items-start gap-4 md:gap-6 md:flex-row">
          <Avatar className="h-20 w-20 border-4 border-background md:h-32 md:w-32">
            <AvatarFallback className="border border-border/70 bg-background/70 text-2xl font-light text-foreground md:text-4xl">
              {initials}
            </AvatarFallback>
          </Avatar>

          <div className="space-y-3 md:space-y-4 text-center md:text-left">
            <div>
              <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
                <h1 className="ui-page-title text-[var(--fs-2xl)] md:text-[var(--fs-4xl)]">
                  {firstName} {lastName}
                </h1>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={gender === "MALE" ? "default" : "secondary"}
                    className="rounded-full px-2 sm:px-3 text-xs"
                  >
                    {formatGenderLabel(gender)}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="rounded-full px-2 sm:px-3 text-xs"
                  >
                    {age} years
                  </Badge>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 opacity-70" />
                  <span>
                    DOB:{" "}
                    <span className="text-foreground">
                      {dateOfBirth
                        ? formatDate(dateOfBirth, "MMM d, yyyy")
                        : "N/A"}
                    </span>
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Shield className="h-4 w-4 opacity-70" />
                  <span>ID: {patientId.slice(0, 8)}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap justify-center md:justify-start gap-2">
              {email && (
                <Badge
                  variant="secondary"
                  className="gap-1 py-1 pl-1.5 pr-2 text-xs font-normal max-w-[200px] truncate"
                >
                  <Mail className="h-3 w-3 opacity-70 shrink-0" />
                  <span className="truncate">{email}</span>
                </Badge>
              )}
              {phoneNumber && (
                <Badge
                  variant="secondary"
                  className="gap-1 py-1 pl-1.5 pr-2 text-xs font-normal"
                >
                  <Phone className="h-3 w-3 opacity-70 shrink-0" />
                  {phoneNumber}
                </Badge>
              )}
              {address && (
                <Badge
                  variant="secondary"
                  className="gap-1 py-1 pl-1.5 pr-2 text-xs font-normal max-w-[200px] truncate"
                >
                  <MapPin className="h-3 w-3 opacity-70 shrink-0" />
                  <span className="truncate">{address}</span>
                </Badge>
              )}
            </div>
          </div>
        </div>

        {onEdit && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-2 rounded-full"
              onClick={onEdit}
            >
              <Edit className="h-4 w-4" />
              Edit Profile
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
