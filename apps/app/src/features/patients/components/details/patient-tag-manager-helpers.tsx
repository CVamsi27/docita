import { resolveTagColor } from "./tag-colors";
import { Badge, Button, Input, Label, ScrollArea } from "@workspace/ui/components";
import { Check, Palette, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { PresetTag } from "./patient-tag.types";
import { type PresetTagLike } from "./patient-tag-manager-logic";
import { ColorPickerGrid, ColorSwatchButton } from "./patient-tag-color-pickers";



// Re-export CurrentTagsTab (extracted to its own file to stay within SRP budget)
export { CurrentTagsTab } from "./patient-tag-current-tab";

// ---------------------------------------------------------------------------
// PresetsTab
// ---------------------------------------------------------------------------

interface PresetsTabProps {
  searchQuery: string;
  filteredPresets: PresetTag[];
  groupedPresets: Record<string, PresetTagLike[]>;
  hasTag: (tagName: string) => boolean;
  onAddTag: (tag: string, color: string) => void;
}

export function PresetsTab({
  searchQuery,
  filteredPresets,
  groupedPresets,
  hasTag,
  onAddTag,
}: PresetsTabProps) {
  const { t } = useTranslation("Patients.tagManager");
  return (
    <ScrollArea className="h-[300px] pr-4">
      {searchQuery && filteredPresets.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          {t("noPresetsMatch", { query: searchQuery })}
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedPresets).map(([category, categoryTags]) => {
            const visibleTags = searchQuery
              ? categoryTags.filter((tag) =>
                  tag.tag.toLowerCase().includes(searchQuery.toLowerCase()),
                )
              : categoryTags;
            if (visibleTags.length === 0) return null;
            return (
              <div key={category}>
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                  {category}
                </Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {visibleTags.map((preset) => {
                    const isAdded = hasTag(preset.tag);
                    const presetColor = resolveTagColor(preset.color);
                    return (
                      <Badge
                        key={preset.tag}
                        variant="outline"
                        style={{
                          borderColor: presetColor,
                          color: isAdded ? "var(--muted-foreground)" : presetColor,
                          opacity: isAdded ? 0.5 : 1,
                        }}
                        className={`cursor-pointer transition-colors duration-150 ${
                          isAdded ? "cursor-not-allowed" : "hover:bg-accent"
                        }`}
                        onClick={() => !isAdded && onAddTag(preset.tag, preset.color)}
                      >
                        {isAdded && <Check className="h-3 w-3 mr-1" />}
                        {preset.tag}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </ScrollArea>
  );
}

// ---------------------------------------------------------------------------
// CustomTagTab
// ---------------------------------------------------------------------------

interface CustomTagTabProps {
  newTag: string;
  newColor: string;
  loading: boolean;
  showColorPicker: boolean;
  onNewTagChange: (v: string) => void;
  onToggleColorPicker: () => void;
  onSelectNewColor: (c: string) => void;
  onAddCustomTag: () => void;
  hasTag: (tagName: string) => boolean;
  getTagColorName: (color: string) => string;
}

export function CustomTagTab({
  newTag,
  newColor,
  loading,
  showColorPicker,
  onNewTagChange,
  onToggleColorPicker,
  onSelectNewColor,
  onAddCustomTag,
  hasTag,
  getTagColorName,
}: CustomTagTabProps) {
  const { t } = useTranslation("Patients.tagManager");
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>{t("tagNameLabel")}</Label>
        <Input
          placeholder={t("tagNamePlaceholder")}
          value={newTag}
          onChange={(e) => onNewTagChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onAddCustomTag();
            }
          }}
        />
      </div>

      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Palette className="h-4 w-4" />
          {t("tagColorLabel")}
        </Label>
        <div className="flex items-center gap-3">
          <ColorSwatchButton
            color={newColor}
            label={t("chooseColorAria", { name: getTagColorName(newColor) })}
            onClick={onToggleColorPicker}
            className="h-10 w-10 rounded-lg border-2 border-border shadow-sm"
          />
          <span className="text-sm text-muted-foreground">
            {getTagColorName(newColor)}
          </span>
        </div>

        {showColorPicker && (
          <div className="p-3 border rounded-lg bg-card mt-2">
            <ColorPickerGrid
              selectedColor={newColor}
              onSelect={onSelectNewColor}
              cols={9}
              swatchSize="h-8 w-8"
            />
          </div>
        )}
      </div>

      {newTag.trim() && (
        <div className="space-y-2">
          <Label>{t("previewLabel")}</Label>
          <Badge
            style={{
              backgroundColor: resolveTagColor(newColor),
              color: "var(--primary-foreground)",
            }}
          >
            {newTag}
          </Badge>
        </div>
      )}

      <Button
        onClick={onAddCustomTag}
        disabled={!newTag.trim() || loading || hasTag(newTag)}
        className="w-full"
      >
        <Plus className="h-4 w-4 mr-2" />
        {t("addTagButton")}
      </Button>

      {hasTag(newTag) && newTag.trim() && (
        <p className="text-sm text-destructive text-center">
          {t("tagAlreadyExists")}
        </p>
      )}
    </div>
  );
}
