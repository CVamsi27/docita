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
import type {
  DrugInteraction,
  PrescriptionSuggestion,
} from "@/features/ai-assistant/hooks/use-ai-assistant-logic";
import { EmptyState } from "@/features/ai-assistant/components/empty-state";
import type { PrescriptionAssistantTabProps } from "@workspace/types";

export const PrescriptionAssistantTab = ({
  state,
  handlers,
}: PrescriptionAssistantTabProps) => (
  <div className="grid gap-6 lg:grid-cols-2">
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Pill className="h-5 w-5 text-info" />
          Prescription Assistant
        </CardTitle>
        <CardDescription>
          Get AI-powered medication suggestions and drug interaction checks
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Symptoms / Chief Complaint
          </label>
          <Textarea
            placeholder="Enter symptoms or chief complaint"
            value={state.symptoms}
            onChange={(e) => handlers.setSymptoms(e.target.value)}
            rows={3}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Working diagnosis</label>
          <Input
            placeholder="Working diagnosis"
            value={state.diagnosis}
            onChange={(e) => handlers.setDiagnosis(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Current Medications (for interaction check)
          </label>
          <Textarea
            placeholder="Enter current medications"
            value={state.currentMedications}
            onChange={(e) => handlers.setCurrentMedications(e.target.value)}
            rows={2}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Known allergies</label>
          <Input
            placeholder="Known allergies"
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
              Analyzing…
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Get Suggestions
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
            label="Enter symptoms and diagnosis to get AI-powered medication suggestions"
          />
        )
      )}
    </div>
  </div>
);

const DrugInteractionsList = ({
  interactions,
}: {
  interactions: DrugInteraction[];
}) => (
  <Card className="surface-warning">
    <CardHeader className="pb-3">
      <CardTitle className="flex items-center gap-2 text-warning">
        <AlertTriangle className="h-5 w-5" />
        Drug Interactions Detected
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
                {interaction.drug1} ↔ {interaction.drug2}
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

const PrescriptionSuggestionsList = ({
  suggestions,
}: {
  suggestions: PrescriptionSuggestion[];
}) => (
  <Card>
    <CardHeader className="pb-3">
      <CardTitle className="flex items-center gap-2">
        <CheckCircle2 className="h-5 w-5 text-success" />
        Suggested Medications
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
                Add to Prescription
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
              <div>
                <span className="font-medium">Dosage:</span> {suggestion.dosage}
              </div>
              <div>
                <span className="font-medium">Route:</span> {suggestion.route}
              </div>
              <div>
                <span className="font-medium">Frequency:</span>{" "}
                {suggestion.frequency}
              </div>
              <div>
                <span className="font-medium">Duration:</span>{" "}
                {suggestion.duration}
              </div>
            </div>
            {suggestion.notes && (
              <p className="mt-2 text-xs text-muted-foreground bg-muted p-2 rounded">
                Note: {suggestion.notes}
              </p>
            )}
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);
