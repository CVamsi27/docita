import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  SymbolTooltip
} from "@workspace/ui/components";
import { AlertCircle, Lightbulb, TrendingUp, X } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";

export interface Suggestion {
  type: "diagnosis" | "investigation" | "treatment";
  text: string;
  confidence: "high" | "medium" | "low";
  reason?: string;
}

export interface ClinicalSuggestionsUIProps {
  suggestions: Suggestion[];
  visible: boolean;
  onHide: () => void;
  onDismiss: (text: string) => void;
  onApply?: (suggestion: Suggestion) => void;
  className?: string;
}

export function ClinicalSuggestionsUI({
  suggestions,
  visible,
  onHide,
  onDismiss,
  onApply,
  className,
}: ClinicalSuggestionsUIProps) {
  if (!visible || suggestions.length === 0) return null;

  const confidenceColors = {
    high: "badge-success",
    medium: "badge-warning",
    low: "badge-muted",
  };

  const typeIcons = {
    diagnosis: "Dx",
    investigation: "Ix",
    treatment: "Rx",
  };

  return (
    <Card className={cn("surface-info", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-info" />
            Clinical Decision Support
          </CardTitle>
          <SymbolTooltip label="Hide clinical suggestions">
            <Button
              variant="ghost"
              size="sm"
              onClick={onHide}
              className="h-6 w-6 p-0"
              aria-label="Hide clinical suggestions"
            >
              <X className="h-3 w-3" />
            </Button>
          </SymbolTooltip>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          AI-suggested actions based on chief complaint
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {suggestions.map((suggestion, index) => (
          <div
            key={index}
            className="flex items-start gap-3 p-3 bg-background border rounded-lg hover:shadow-sm transition-shadow"
          >
            <div className="text-lg mt-0.5">{typeIcons[suggestion.type]}</div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{suggestion.text}</span>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs",
                    confidenceColors[suggestion.confidence],
                  )}
                >
                  {suggestion.confidence === "high" && (
                    <TrendingUp className="h-3 w-3 mr-1" />
                  )}
                  {suggestion.confidence === "medium" && (
                    <AlertCircle className="h-3 w-3 mr-1" />
                  )}
                  {suggestion.confidence} confidence
                </Badge>
              </div>
              {suggestion.reason && (
                <p className="text-xs text-muted-foreground">
                  {suggestion.reason}
                </p>
              )}
            </div>
            <div className="flex gap-1">
              {onApply && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onApply(suggestion)}
                  className="h-7 text-xs"
                >
                  Apply
                </Button>
              )}
              <SymbolTooltip label="Dismiss suggestion">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onDismiss(suggestion.text)}
                  className="h-7 w-7 p-0"
// jscpd:ignore-start
                  aria-label="Dismiss suggestion"
                >
                  <X className="h-3 w-3" />
                </Button>
              </SymbolTooltip>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
// jscpd:ignore-end
