import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
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
          <Users className="h-5 w-5 text-purple-500" />
          Family History
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {patient.familyHistory?.map((history) => (
              <Badge
                key={history.id}
                variant="outline"
                className="pl-2 pr-1 py-1 h-auto bg-background hover:bg-muted/50 transition-colors flex items-center gap-2 border-primary/20"
              >
                <div className="flex flex-col text-xs">
                  <span className="font-semibold">{history.condition}</span>
                  <span className="text-muted-foreground">
                    ({history.relationship})
                  </span>
                </div>
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => onRemoveFamilyHistory(history.id!)}
                    className="ml-1 hover:text-destructive transition-colors focus:outline-none"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </Badge>
            ))}
            {(!patient.familyHistory || patient.familyHistory.length === 0) && (
              <span className="text-sm text-muted-foreground italic">
                No family history recorded
              </span>
            )}
          </div>
          {!readOnly && (
            <div className="flex gap-2 items-center mt-1">
              <Input
                placeholder="Condition (e.g. Diabetes)"
                value={newFamilyCondition}
                onChange={(e) => onNewFamilyConditionChange(e.target.value)}
                className="h-8 text-sm flex-1"
              />
              <Input
                placeholder="Relationship (e.g. Mother)"
                value={newFamilyRelation}
                onChange={(e) => onNewFamilyRelationChange(e.target.value)}
                className="h-8 text-sm w-32"
              />
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={onAddFamilyHistory}
                disabled={
                  !newFamilyCondition.trim() || !newFamilyRelation.trim()
                }
                className="h-8"
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
