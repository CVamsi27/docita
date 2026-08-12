import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { PageMeta } from "@/components/layout/page-meta";
import { Button } from "@workspace/ui/components";
import { Building2, Plus, Search, ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import {
  getClinicsForSelection,
  type ClinicSelection,
} from "@/features/setup/api/clinic-selection.api";

export function ClinicSelectionPage() {
  const { t } = useTranslation("Setup.clinicSelection");
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const { data: clinics, isLoading, error } = useQuery<ClinicSelection[]>({
    queryKey: ["clinics"],
    queryFn: getClinicsForSelection,
  });

  const filteredClinics = useMemo(() => {
    if (!clinics) return [];
    const q = search.toLowerCase();
    return clinics.filter(
      (c) => c.name.toLowerCase().includes(q) || (c.city && c.city.toLowerCase().includes(q))
    );
  }, [clinics, search]);

  return (
    <>
      <PageMeta title={t("pageTitle")} noSuffix />
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 py-12">
        <Button variant="ghost" onClick={() => navigate("/choose-path")} className="self-start max-w-md w-full flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground cursor-pointer">
          <ArrowLeft className="h-4 w-4" /> {t("backButton")}
        </Button>
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-xl font-semibold">{t("title")}</h1>
            <p className="text-sm text-muted-foreground">{t("description")}</p>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder={t("searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border bg-background py-2.5 pl-10 pr-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
          </div>

          {isLoading && (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> {t("loading")}
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-6 text-center">
              <AlertCircle className="h-6 w-6 text-destructive" />
              <p className="text-sm font-medium">{t("loadErrorTitle")}</p>
              <p className="text-xs text-muted-foreground">{t("loadErrorDescription")}</p>
            </div>
          )}

          {!isLoading && !error && filteredClinics.length === 0 && (
            <div className="rounded-lg border p-8 text-center">
              <Building2 className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                {search ? t("noSearchResults") : t("noClinics")}
              </p>
            </div>
          )}

          {!isLoading && filteredClinics.map((clinic) => (
            <Button
              key={clinic.id}
              variant="outline"
              onClick={() => navigate("/onboarding", { state: { clinicId: clinic.id } })}
              className="w-full flex items-center gap-3 rounded-lg border p-4 text-left hover:bg-muted/30 cursor-pointer h-auto"
              aria-label={t("selectAriaLabel", { name: clinic.name })}
            >
              <div className="rounded-full bg-primary/10 p-2">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{clinic.name}</p>
                <p className="text-xs text-muted-foreground truncate">{clinic.city || clinic.address || clinic.role}</p>
              </div>
            </Button>
          ))}

          <Button className="w-full" onClick={() => navigate("/onboarding")}>
            <Plus className="mr-1.5 h-4 w-4" /> {t("createNewClinic")}
          </Button>
        </div>
      </div>
    </>
  );
}
