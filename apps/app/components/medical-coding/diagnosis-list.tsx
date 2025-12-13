"use client";

import { AlertCircle, Star, StarOff, Trash2 } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { Textarea } from "@workspace/ui/components/textarea";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import type { Diagnosis } from "@/types";

interface DiagnosisListProps {
  diagnoses: Diagnosis[];
  onRemove: (index: number) => void;
  onUpdateNotes: (index: number, notes: string) => void;
  onTogglePrimary: (index: number) => void;
}

export function DiagnosisList({
  diagnoses,
  onRemove,
  onUpdateNotes,
  onTogglePrimary,
}: DiagnosisListProps) {
  if (diagnoses.length === 0) {
    return (
      <div className="text-center p-8 border-2 border-dashed rounded-lg text-muted-foreground">
        <AlertCircle className="mx-auto h-8 w-8 mb-2 opacity-50" />
        <p>No diagnoses added yet.</p>
        <p className="text-sm">Search and select ICD-10 codes to add them.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {diagnoses.map((diagnosis, index) => (
        <Card key={index} className="relative overflow-hidden">
          {diagnosis.isPrimary && (
            <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-bl-lg font-medium">
              Primary Diagnosis
            </div>
          )}
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start pr-8">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-sm">
                    {diagnosis.icdCode?.code}
                  </span>
                  {diagnosis.icdCode?.description}
                </CardTitle>
                <CardDescription className="text-xs mt-1">
                  Category: {diagnosis.icdCode?.category}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Textarea
                placeholder="Add clinical notes for this diagnosis..."
                value={diagnosis.notes || ""}
                onChange={(e) => onUpdateNotes(index, e.target.value)}
                className="min-h-[60px] text-sm"
              />

              <div className="flex justify-end gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onTogglePrimary(index)}
                        className={
                          diagnosis.isPrimary
                            ? "text-primary"
                            : "text-muted-foreground"
                        }
                      >
                        {diagnosis.isPrimary ? (
                          <>
                            <Star className="h-4 w-4 mr-1 fill-primary" />
                            Primary
                          </>
                        ) : (
                          <>
                            <StarOff className="h-4 w-4 mr-1" />
                            Set Primary
                          </>
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Mark as primary diagnosis for billing/insurance</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemove(index)}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Remove
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
