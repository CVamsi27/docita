// jscpd:ignore-start
import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { Button } from "@workspace/ui/components/form/button";
import { Input } from "@workspace/ui/components/form/input";
import { Textarea } from "@workspace/ui/components/form/textarea";
import { Badge } from "@workspace/ui/components/indicators/badge";
import { AlertTriangle, CheckCircle2, Lightbulb, Pill, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import type {
  DrugInteraction,
  PrescriptionSuggestion,
} from "@/features/ai-assistant/hooks/use-ai-assistant-logic";
import { EmptyState } from "@/features/ai-assistant/components/empty-state";
import type { PrescriptionAssistantTabProps } from "@workspace/types";

/**
 * Phase 3 (per-feature): apps/app AI assistant > Prescription assistant
 * tab. 6 literals converted to
 * useTranslations("AiAssistant.prescriptionAssistantTab").
 */
function usePrescriptionAssistantTranslations() {
  return useTranslations("AiAssistant.prescriptionAssistantTab");
}

export const PrescriptionAssistantTab = ({
  state,
  handlers,
}: PrescriptionAssistantTabProps) => {
  const t = usePrescriptionAssistantTranslations();
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Pill className="h-5 w-5 text-info" />
            {t("title")}
          </CardTitle>
          <CardDescription>
            {t("description")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {t("symptomsLabel")}
            </label>
            <Textarea
              placeholder={t("symptomsPlaceholder")}
              value={state.symptoms}
              onChange={(e) => handlers.setSymptoms(e.target.value)}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">{t("diagnosisLabel")}</label>
            <Input
              placeholder={t("diagnosisPlaceholder")}
              value={state.diagnosis}
              onChange={(e) => handlers.setDiagnosis(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {t("currentMedicationsLabel")}
            </label>
            <Textarea
              placeholder={t("currentMedicationsPlaceholder")}
              value={state.currentMedications}
              onChange={(e) => handlers.setCurrentMedications(e.target.value)}
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">{t("allergiesLabel")}</label>
            <Input
              placeholder={t("allergiesPlaceholder")}
              value={state.allergies}
              onChange={(e) => handlers.setAllergies(e.target.value)}
            />
          </div>
          <Button
            onClick={handlers.handlePrescriptionAnalysis}
            disabled={state.isLoading || !state.symptoms}
            className="w-full"
          >
            {state.isLoading ? (
              <>
                <DocitaLoadingIndicator variant="inline" decorative className="mr-2" />
                {t("analyzingLabel")}
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                {t("getSuggestionsButton")}
{/* jscpd:ignore-end */}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-6">
        {state.drugInteractions.length > 0 && (
          <DrugInteractionsList interactions={state.drugInteractions} />
        )}
        {state.prescriptionSuggestions.length > 0 ? (
          <PrescriptionSuggestionsList
            suggestions={state.prescriptionSuggestions}
          />
        ) : (
          !state.isLoading && (
            <EmptyState
              icon={Lightbulb}
              label={t("emptyHelper")}
            />
          )
        )}
      </div>
    </div>
  );
};

const DrugInteractionsList = ({
  interactions,
}: {
  interactions: DrugInteraction[];
}) => {
  const t = usePrescriptionAssistantTranslations();
  return (
    <Card className="surface-warning">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-warning">
          <AlertTriangle className="h-5 w-5" />
          {t("interactionsTitle")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {interactions.map((interaction, idx) => (
            <div
              key={idx}
              className="p-3 rounded-lg bg-background border"
            >
              <div className="flex items-center gap-2 mb-1">
                <Badge
                  variant={
                    interaction.severity === "high"
                      ? "destructive"
                      : interaction.severity === "moderate"
                        ? "secondary"
                        : "outline"
                  }
                >
                  {interaction.severity.toUpperCase()}
                </Badge>
                <span className="font-medium text-sm">
                  {t("interactionPair", { drug1: interaction.drug1, drug2: interaction.drug2 })}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {interaction.description}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

const PrescriptionSuggestionsList = ({
  suggestions,
}: {
  suggestions: PrescriptionSuggestion[];
}) => {
  const t = usePrescriptionAssistantTranslations();
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-success" />
          {t("suggestionsTitle")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {suggestions.map((suggestion, idx) => (
            <div
              key={idx}
              className="p-4 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold">{suggestion.medication}</span>
                <Button size="sm" variant="outline">
                  {t("addToPrescriptionButton")}
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                <div>
                  <span className="font-medium">{t("dosageLabel")}</span> {suggestion.dosage}
                </div>
                <div>
                  <span className="font-medium">{t("routeLabel")}</span> {suggestion.route}
                </div>
                <div>
                  <span className="font-medium">{t("frequencyLabel")}</span>{" "}
                  {suggestion.frequency}
                </div>
                <div>
                  <span className="font-medium">{t("durationLabel")}</span>{" "}
                  {suggestion.duration}
                </div>
              </div>
              {suggestion.notes && (
                <p className="mt-2 text-xs text-muted-foreground bg-muted p-2 rounded">
                  {t("noteLabel", { note: suggestion.notes })}
                </p>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
