"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Building2, Mail, Phone, MapPin } from "lucide-react";
import { Input } from "@workspace/ui/components/input";
import { Button } from "@workspace/ui/components/button";
import { Card } from "@workspace/ui/components/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Textarea } from "@workspace/ui/components/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Badge } from "@workspace/ui/components/badge";
import { toast } from "sonner";
import { typedApi } from "@/lib/api-client";
import { logger } from "@/lib/logger";
import { PageTransitionLoader } from "@/components/common/loaders/page-transition-loader";
import { showUserFacingErrorToast } from "@/lib/user-facing-errors";
import { useAuth } from "@/lib/auth-context";
import { PreDashboardShell } from "@/features/auth/components/PreDashboardShell";
import { BackButton } from "@/components/common/navigation/back-button";

interface Clinic {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  canJoin: boolean;
  existingRequestStatus: string | null;
}

export default function JoinClinicPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedClinic, setSelectedClinic] = useState<Clinic | null>(null);
  const [requestedRole, setRequestedRole] = useState<string>("DOCTOR");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      setIsRedirecting(true);
      router.replace("/login?next=/join-clinic");
      return;
    }

    if (user?.clinicId || user?.onboardingStep === "COMPLETED") {
      setIsRedirecting(true);
      router.replace("/dashboard");
      return;
    }

    if (user?.onboardingStep === "JOINING_CLINIC") {
      setIsRedirecting(true);
      router.replace("/join-request-status");
      return;
    }

    if (user?.onboardingStep === "CREATING_CLINIC") {
      setIsRedirecting(true);
      router.replace("/onboarding");
    }
  }, [isAuthenticated, isLoading, router, user]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      showUserFacingErrorToast("Enter a facility name before searching");
      return;
    }

    setIsSearching(true);
    try {
      const results = await typedApi.clinics.searchForJoin(searchQuery);
      setClinics(results as Clinic[]);

      if ((results as Clinic[]).length === 0) {
        toast.info("No facilities found matching your search");
      }
    } catch (error) {
      showUserFacingErrorToast(
        "We could not search for facilities right now. Please try again.",
      );
      logger.error("Search error", { error });
    } finally {
      setIsSearching(false);
    }
  };

  const handleSubmitRequest = async () => {
    if (!selectedClinic) return;

    setIsSubmitting(true);
    try {
      await typedApi.joinRequests.create({
        clinicId: selectedClinic.id,
        requestedRole,
        message: message.trim() || undefined,
      });

      toast.success("Join request submitted successfully!");
      setSelectedClinic(null);
      setIsRedirecting(true);
      router.replace("/join-request-status");
    } catch (error) {
      showUserFacingErrorToast(
        "We could not submit this join request. Please try again.",
      );
      logger.error("Submit error", { error });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  if (isRedirecting) {
    return (
      <PageTransitionLoader
        title="Request submitted"
        description="Taking you to request status"
      />
    );
  }

  return (
    <PreDashboardShell
      currentStep="join-clinic"
      contentMaxWidth="max-w-2xl"
      contentAlignment="start"
      showSignOut
    >
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 ui-copy-stack">
        <BackButton
          fallback="/choose-path"
          label="Back to Choose Path"
          className="mb-2 -ml-2 text-muted-foreground hover:text-foreground"
        />
        <h1 className="ui-page-title">Join a Facility</h1>
        <p className="ui-page-subtitle">
          Search for your facility by name, email, or referral code
        </p>
      </div>

      <div
        className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700"
        style={{ animationDelay: "100ms" }}
      >
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by facility name, email, or code"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              className="pl-10 h-11"
            />
          </div>
          <Button
            onClick={handleSearch}
            disabled={isSearching}
            className="h-11"
          >
            {isSearching ? "Searching..." : "Search"}
          </Button>
        </div>

        {clinics.length === 0 && searchQuery && !isSearching && (
          <Card className="ui-card-surface p-8 text-center">
            <p className="ui-helper-text">
              No facilities found, try a different search term
            </p>
          </Card>
        )}

        <div className="space-y-3">
          {clinics.map((clinic) => (
            <Card
              key={clinic.id}
              className="ui-card-surface p-5"
            >
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="shrink-0 rounded-full border border-border/70 bg-background/70 p-2">
                      <Building2 className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{clinic.name}</h3>
                      {clinic.existingRequestStatus && (
                        <Badge variant="secondary" className="mt-1 text-xs">
                          Request {clinic.existingRequestStatus}
                        </Badge>
                      )}
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
                  onClick={() => setSelectedClinic(clinic)}
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
      </div>

      <Dialog
        open={!!selectedClinic}
        onOpenChange={() => setSelectedClinic(null)}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Request to Join {selectedClinic?.name}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Your Role</label>
              <Select value={requestedRole} onValueChange={setRequestedRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DOCTOR">Doctor</SelectItem>
                  <SelectItem value="NURSE">Nurse</SelectItem>
                  <SelectItem value="RECEPTIONIST">Receptionist</SelectItem>
                  <SelectItem value="ADMIN_DOCTOR">Admin Doctor</SelectItem>
                </SelectContent>
              </Select>
              <p className="ui-helper-text">
                Select the role you will have in this facility
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Message to Admin <span className="text-muted-foreground">(optional)</span>
              </label>
              <Textarea
                placeholder="Tell us why you want to join"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={500}
                rows={4}
              />
              <p className="ui-helper-text text-right">
                {message.length}/500
              </p>
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => setSelectedClinic(null)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmitRequest} disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit Request"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PreDashboardShell>
  );
}
