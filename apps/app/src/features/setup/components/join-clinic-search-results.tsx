import { Building2, Mail, MapPin, Phone } from "lucide-react";
import { Button } from "@workspace/ui/components/form/button";
import { Badge } from "@workspace/ui/components/indicators/badge";
import { Card } from "@workspace/ui/components/indicators/card";

export interface JoinClinicSearchResult {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  canJoin: boolean;
  existingRequestStatus: string | null;
}

export function JoinClinicSearchResults({
  clinics,
  onSelectClinic,
}: {
  clinics: JoinClinicSearchResult[];
  onSelectClinic: (clinic: JoinClinicSearchResult) => void;
}) {
  return (
    <div className="space-y-3">
      {clinics.map((clinic) => (
        <Card key={clinic.id} className="ui-card-surface p-5">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
            <div className="flex-1">
              <div className="flex items-start gap-3 mb-3">
                <div className="shrink-0 rounded-full border border-border/70 bg-background/70 p-2">
                  <Building2 className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">{clinic.name}</h3>
                  {clinic.existingRequestStatus ? (
                    <Badge variant="secondary" className="mt-1 text-xs">
                      Request {clinic.existingRequestStatus}
                    </Badge>
                  ) : null}
                </div>
              </div>

              <div className="ml-11 space-y-1.5 ui-helper-text">
                <div className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5" />
                  <span>{clinic.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5" />
                  <span>{clinic.phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5" />
                  <span>{clinic.address}</span>
                </div>
              </div>
            </div>

            <Button
              onClick={() => onSelectClinic(clinic)}
              disabled={!clinic.canJoin}
              size="sm"
              className="sm:min-w-[140px] shrink-0"
            >
              {clinic.canJoin ? "Request to Join" : "Request Pending"}
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
