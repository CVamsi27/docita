
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Textarea } from "@workspace/ui/components/textarea";
import { Badge } from "@workspace/ui/components/badge";
import {
  Brain,
  Loader2,
  Shield,
  Sparkles,
  Stethoscope,
} from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import type { DiagnosisSuggestion } from "../../hooks/use-ai-assistant-logic";
import { EmptyState } from "../AIAssistantUI";

export const DiagnosisAssistantTab = ({ state, handlers }: any) => (
  <div className="grid gap-6 lg:grid-cols-2">
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-purple-500" />
          Diagnosis Assistant
        </CardTitle>
        <CardDescription>
          AI-powered differential diagnosis suggestions based on clinical
          findings
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Chief Complaint</label>
          <Textarea
            placeholder="e.g., 45-year-old male presents with chest pain radiating to left arm..."
            value={state.chiefComplaint}
            onChange={(e) => handlers.setChiefComplaint(e.target.value)}
            rows={3}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Vital Signs</label>
          <Textarea
            placeholder="e.g., BP: 150/90, HR: 88, Temp: 98.6°F, SpO2: 97%..."
            value={state.vitalSigns}
            onChange={(e) => handlers.setVitalSigns(e.target.value)}
            rows={2}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Physical Examination Findings
          </label>
          <Textarea
            placeholder="e.g., Pharynx erythematous, tonsillar exudates present..."
            value={state.examFindings}
            onChange={(e) => handlers.setExamFindings(e.target.value)}
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
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Get Differential Diagnoses
            </>
          )}
        </Button>
        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
          <Shield className="h-4 w-4 text-amber-600 mt-0.5" />
          <p className="text-xs text-amber-700 dark:text-amber-400">
            <strong>Clinical Decision Support:</strong> These suggestions are
            for reference only and do not replace clinical judgment.
          </p>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Stethoscope className="h-5 w-5" />
          Differential Diagnoses
        </CardTitle>
        <CardDescription>
          Ranked by confidence based on provided information
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
                      ? "bg-green-50 dark:bg-green-950/20 border-green-200"
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
                              ? "bg-green-500"
                              : suggestion.confidence >= 50
                                ? "bg-yellow-500"
                                : "bg-orange-500",
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
                      Select as Primary
                    </Button>
                    <Button size="sm" variant="ghost">
                      View Details
                    </Button>
                  </div>
                </div>
              ),
            )}
          </div>
        ) : (
          <EmptyState
            icon={Brain}
            label="Enter clinical findings to get AI-powered diagnosis suggestions"
          />
        )}
      </CardContent>
    </Card>
  </div>
);
