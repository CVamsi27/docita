import { useTranslation } from "react-i18next";
import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Textarea } from "@workspace/ui/components";
import { Brain, Shield, Sparkles, Stethoscope } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import type { DiagnosisSuggestion } from "@/features/ai-assistant/hooks/use-ai-assistant-logic";
import { EmptyState } from "@/features/ai-assistant/components/empty-state";
import type { DiagnosisAssistantTabProps } from "@workspace/types";

export const DiagnosisAssistantTab = ({
  state,
  handlers,
}: DiagnosisAssistantTabProps) => {
  const { t } = useTranslation("AiAssistant.diagnosisTabPane");
  return (
  <div className="grid gap-6 lg:grid-cols-2">
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          {t("title")}
        </CardTitle>
        <CardDescription>
          {t("description")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">{t("chiefComplaintLabel")}</label>
          <Textarea
            placeholder={t("chiefComplaintPlaceholder")}
            value={state.chiefComplaint}
            onChange={(e) => handlers.setChiefComplaint(e.target.value)}
            rows={3}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">{t("vitalSignsLabel")}</label>
          <Textarea
            placeholder={t("vitalSignsPlaceholder")}
            value={state.vitalSigns}
            onChange={(e) => handlers.setVitalSigns(e.target.value)}
            rows={2}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">
            {t("examFindingsLabel")}
          </label>
          <Textarea
            placeholder={t("examFindingsPlaceholder")}
            value={state.examFindings}
            onChange={(e) => handlers.setExamFindings(e.target.value)}
// jscpd:ignore-start
            rows={3}
          />
        </div>
        <Button
          onClick={handlers.handleDiagnosisAnalysis}
          disabled={state.isLoading || !state.chiefComplaint}
          className="w-full"
        >
          {state.isLoading ? (
            <>
              <DocitaLoadingIndicator variant="inline" decorative className="mr-2" />
              {t("analyzing")}
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              {t("getDiagnoses")}
{/* jscpd:ignore-end */}
            </>
          )}
        </Button>
        <div className="flex items-start gap-2 p-3 rounded-lg surface-warning">
          <Shield className="h-4 w-4 text-warning mt-0.5" />
          <p className="text-xs text-warning">
            <strong>{t("cdsLabel")}</strong> {t("cdsDisclaimer")}
          </p>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Stethoscope className="h-5 w-5" />
          {t("resultsTitle")}
        </CardTitle>
        <CardDescription>
          {t("resultsDescription")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {state.diagnosisSuggestions.length > 0 ? (
          <div className="space-y-3">
            {state.diagnosisSuggestions.map(
              (suggestion: DiagnosisSuggestion, idx: number) => (
                <div
                  key={idx}
                  className={cn(
                    "p-4 rounded-lg border transition-colors",
                    idx === 0
                      ? "bg-success/10 border-success/30"
                      : "bg-muted/30",
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">
                        {suggestion.condition}
                      </span>
                      <Badge variant="outline" className="font-mono text-xs">
                        {suggestion.icdCode}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-16 rounded-full bg-muted overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full",
                            suggestion.confidence >= 70
                              ? "bg-success"
                              : suggestion.confidence >= 50
                                ? "bg-warning"
                                : "bg-destructive",
                          )}
                          style={{ width: `${suggestion.confidence}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium">
                        {suggestion.confidence}%
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {suggestion.reasoning}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" variant="outline">
                      {t("selectPrimary")}
                    </Button>
                    <Button size="sm" variant="ghost">
                      {t("viewDetails")}
                    </Button>
                  </div>
                </div>
              ),
            )}
          </div>
        ) : (
          <EmptyState
            icon={Brain}
            label={t("emptyState")}
          />
        )}
      </CardContent>
    </Card>
  </div>
  );
};
