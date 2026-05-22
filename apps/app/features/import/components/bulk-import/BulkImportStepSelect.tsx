import { cn } from "@workspace/ui/lib/utils";
import { Button } from "@workspace/ui/components/form/button";
import { ENTITIES, EntityType } from "./types";

interface BulkImportStepSelectProps {
  selectedEntity: EntityType;
  onSelectEntity: (entity: EntityType) => void;
  onContinue: () => void;
}

export function BulkImportStepSelect({
  selectedEntity,
  onSelectEntity,
  onContinue,
}: BulkImportStepSelectProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm font-medium text-muted-foreground">
        Select the type of data you want to import:
      </p>
      <div className="grid grid-cols-2 gap-3">
        {ENTITIES.map((entity) => (
          <button
            key={entity}
            type="button"
            onClick={() => onSelectEntity(entity)}
            className={cn(
              "flex items-center justify-center p-4 rounded-lg border-2 text-sm font-medium transition-colors duration-150 hover:border-primary/50",
              selectedEntity === entity
                ? "border-primary bg-primary/5 text-primary"
                : "border-muted bg-background hover:bg-muted/50",
            )}
          >
            {entity === "LAB_TEST" ? "Lab Tests" : entity}
          </button>
        ))}
      </div>
      <Button onClick={onContinue} className="w-full">
        Continue
      </Button>
    </div>
  );
}
