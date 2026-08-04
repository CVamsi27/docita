import { resolveTagColor } from "./tag-colors";
import { useTranslation } from "react-i18next";
import { Button } from "@workspace/ui/components/form/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@workspace/ui/components/overlay/tooltip";
import { COLOR_PALETTE } from "./patient-tag-manager-logic";

interface ColorPickerGridProps {
  selectedColor: string;
  onSelect: (color: string) => void;
  cols: number;
  /** Tailwind size class for each swatch, e.g. "h-6 w-6" or "h-8 w-8" */
  swatchSize?: string;
}

export function ColorPickerGrid({
  selectedColor,
  onSelect,
  cols,
  swatchSize = "h-6 w-6",
}: ColorPickerGridProps) {
  const { t } = useTranslation("Patients.tagColorPicker");
  return (
    <div
      className="grid gap-1"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {COLOR_PALETTE.map((color) => (
        <Tooltip key={color.value}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t("useColorAria", { name: color.name })}
              className={`${swatchSize} rounded-md p-0 ${
                selectedColor === color.value
                  ? "ring-2 ring-primary ring-offset-2"
                  : "hover:opacity-80"
              }`}
              style={{ backgroundColor: color.value }}
              onClick={() => onSelect(color.value)}
            />
          </TooltipTrigger>
          <TooltipContent>{color.name}</TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}

interface ColorSwatchButtonProps {
  color: string;
  label: string;
  onClick: () => void;
  className?: string;
}

export function ColorSwatchButton({
  color,
  label,
  onClick,
  className = "h-8 w-8 rounded-md border-2 border-border",
}: ColorSwatchButtonProps) {
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={label}
      onClick={onClick}
      className={`${className} p-0`}
      style={{ backgroundColor: resolveTagColor(color) }}
    />
  );
}
