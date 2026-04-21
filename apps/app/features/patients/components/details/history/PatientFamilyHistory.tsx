import { Button } from "@workspace/ui/components/button";

import { Input } from "@workspace/ui/components/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Users, X } from "lucide-react";
import { PatientWithMedicalHistory } from "@workspace/types";

interface PatientFamilyHistoryProps {
  patient: PatientWithMedicalHistory;
  readOnly: boolean;
  newFamilyCondition: string;
  newFamilyRelation: string;
  onNewFamilyConditionChange: (value: string) => void;
  onNewFamilyRelationChange: (value: string) => void;
  onAddFamilyHistory: () => void;
  onRemoveFamilyHistory: (id: string) => void;
}

export function PatientFamilyHistory({
  patient,
  readOnly,
  newFamilyCondition,
  newFamilyRelation,
  onNewFamilyConditionChange,
  onNewFamilyRelationChange,
  onAddFamilyHistory,
  onRemoveFamilyHistory,
}: PatientFamilyHistoryProps) {
  return (
    <Card className="mt-6">
      <CardHeader className="py-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Family History
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2 mb-4">
          <div className="flex flex-col gap-2">
            {patient.familyHistory?.map((history) => (
              <div
                key={history.id}
                className="flex items-center justify-between p-2.5 rounded-lg border bg-card hover:bg-muted/20 transition-colors group"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium text-sm">
                    {history.condition}
                  </span>
                  <span className="text-muted-foreground text-xs bg-muted px-1.5 py-0.5 rounded-md w-fit">
                    {history.relationship}
                  </span>
                </div>
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => onRemoveFamilyHistory(history.id!)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors duration-150"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
            {(!patient.familyHistory || patient.familyHistory.length === 0) && (
              <div className="w-full py-6 text-center border-2 border-dashed rounded-lg bg-muted/10">
                <span className="text-sm text-muted-foreground">
                  No family history recorded
                </span>
              </div>
            )}
          </div>
          {!readOnly && (
            <div className="flex gap-2 items-start pt-2 border-t border-border/40">
              <div className="grid gap-2 flex-1">
                <div className="relative">
                  <Users className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Condition, e.g. diabetes"
                    value={newFamilyCondition}
                    onChange={(e) => onNewFamilyConditionChange(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <Input
                placeholder="Relationship, e.g. mother"
                value={newFamilyRelation}
                onChange={(e) => onNewFamilyRelationChange(e.target.value)}
                className="w-36"
              />
              <Button
                type="button"
                onClick={onAddFamilyHistory}
                disabled={
                  !newFamilyCondition.trim() || !newFamilyRelation.trim()
                }
              >
                Add
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
