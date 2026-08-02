import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { typedApi } from "@/lib/api/typed-api-client";
import { logger } from "@/lib/monitoring/logger";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import { useAuth } from "@/lib/auth/auth-context";
import { persistReturnPathBeforeLogin } from "@/lib/auth/safe-return-path";
import type { JoinClinicSearchResult } from "@/features/setup/components/join-clinic-search-results";

export function useJoinClinicPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [clinics, setClinics] = useState<JoinClinicSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedClinic, setSelectedClinic] =
    useState<JoinClinicSearchResult | null>(null);
  const [requestedRole, setRequestedRole] = useState<string>("DOCTOR");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      setIsRedirecting(true);
      persistReturnPathBeforeLogin();
      navigate("/login", { replace: true });
      return;
    }

    if (user?.clinicId || user?.onboardingStep === "COMPLETED") {
      setIsRedirecting(true);
      navigate("/today", { replace: true });
      return;
    }

    if (user?.onboardingStep === "JOINING_CLINIC") {
      setIsRedirecting(true);
      navigate("/join-request-status", { replace: true });
      return;
    }

    if (user?.onboardingStep === "CREATING_CLINIC") {
      setIsRedirecting(true);
      navigate("/onboarding", { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, user]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      showUserFacingErrorToast(
        undefined,
        "Enter a facility name before searching",
      );
      return;
    }

    setIsSearching(true);
    try {
      const results = await typedApi.clinics.searchForJoin(searchQuery);
      setClinics(
        results.map((clinic) => ({
          id: clinic.id,
          name: clinic.name,
          email: "",
          phone: "",
          address: clinic.address ?? "",
          canJoin: true,
          existingRequestStatus: null,
        })),
      );

      if (results.length === 0) {
        toast.info("No facilities found matching your search");
      }
    } catch (error) {
      showUserFacingErrorToast(
        undefined,
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
      navigate("/join-request-status", { replace: true });
    } catch (error) {
      showUserFacingErrorToast(
        undefined,
        "We could not submit this join request. Please try again.",
      );
      logger.error("Submit error", { error });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      void handleSearch();
    }
  };

  return {
    searchQuery,
    setSearchQuery,
    clinics,
    isSearching,
    selectedClinic,
    setSelectedClinic,
    requestedRole,
    setRequestedRole,
    message,
    setMessage,
    isSubmitting,
    isRedirecting,
    handleSearch,
    handleSubmitRequest,
    handleSearchKeyPress,
  };
}
