import {
  TAG_COLOR_PALETTE,
  resolveTagColor,
} from "./tag-colors";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  SymbolTooltip,
} from "@workspace/ui/components/tooltip";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Badge } from "@workspace/ui/components/badge";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { Check, Palette, Pencil, Plus, Trash2, X } from "lucide-react";
import type { PatientTag, PresetTag } from "./PatientTagManagerUI";

export const COLOR_PALETTE = TAG_COLOR_PALETTE.map((entry) => ({
  name: entry.name,
  value: entry.cssVar,
}));

export interface PresetTagLike {
  tag: string;
  color: string;
  category?: string;
}

export function groupPresetTags(
  presetTags: PresetTagLike[],
): Record<string, PresetTagLike[]> {
  const groups: Record<string, PresetTagLike[]> = {};

  for (const tag of presetTags) {
    const category = tag.category || "General";
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(tag);
  }

  return groups;
}

export interface ColorPickerGridProps {
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
  return (
    <div
      className="grid gap-1"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {COLOR_PALETTE.map((color) => (
        <Tooltip key={color.value}>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label={`Use ${color.name}`}
              className={`${swatchSize} rounded-md transition-colors duration-150 ${
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

export interface ColorSwatchButtonProps {
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
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={className}
      style={{ backgroundColor: resolveTagColor(color) }}
    />
  );
}

// ---------------------------------------------------------------------------
// CurrentTagsTab
// ---------------------------------------------------------------------------

export interface CurrentTagsTabProps {
  filteredTags: PatientTag[];
  searchQuery: string;
  editingTagId: string | null;
  editTagName: string;
  editTagColor: string;
  editShowColorPicker: boolean;
  onEditTagNameChange: (v: string) => void;
  onToggleEditColorPicker: () => void;
  onSelectEditColor: (c: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onStartEditing: (tag: PatientTag) => void;
  onRemoveTag: (id: string) => void;
  onEditTag?: (tagId: string, newName: string, newColor: string) => void;
  getTagColorName: (color: string) => string;
}

export function CurrentTagsTab({
  filteredTags,
  searchQuery,
  editingTagId,
  editTagName,
  editTagColor,
  editShowColorPicker,
  onEditTagNameChange,
  onToggleEditColorPicker,
  onSelectEditColor,
  onSaveEdit,
  onCancelEdit,
  onStartEditing,
  onRemoveTag,
  onEditTag,
  getTagColorName,
}: CurrentTagsTabProps) {
  return (
    <ScrollArea className="h-[300px] pr-4">
      {filteredTags.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          {searchQuery ? (
            <p>No tags match &quot;{searchQuery}&quot;</p>
          ) : (
            <p>No tags added yet, add from presets or create custom</p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredTags.map((tag) => (
            <div
              key={tag.id}
              className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
            >
              {editingTagId === tag.id ? (
                <div className="flex-1 flex items-center gap-2">
                  <Input
                    value={editTagName}
                    onChange={(e) => onEditTagNameChange(e.target.value)}
                    className="h-8 flex-1"
                    autoFocus
                  />
                  <div className="relative">
                    <ColorSwatchButton
                      color={editTagColor}
                      label={`Choose color (currently ${getTagColorName(editTagColor)})`}
                      onClick={onToggleEditColorPicker}
                    />
                    {editShowColorPicker && (
                      <div className="absolute top-10 right-0 z-50 p-2 bg-popover border rounded-lg shadow-lg">
                        <ColorPickerGrid
                          selectedColor={editTagColor}
                          onSelect={onSelectEditColor}
                          cols={6}
                          swatchSize="h-6 w-6"
                        />
                      </div>
                    )}
                  </div>
                  <SymbolTooltip label="Save tag">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      aria-label="Save tag"
                      onClick={onSaveEdit}
                    >
                      <Check className="h-4 w-4 text-success" />
                    </Button>
                  </SymbolTooltip>
                  <SymbolTooltip label="Cancel edit">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      aria-label="Cancel edit"
                      onClick={onCancelEdit}
                    >
                      <X className="h-4 w-4 text-destructive" />
                    </Button>
                  </SymbolTooltip>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <div
                      className="h-4 w-4 rounded-full border"
                      style={{ backgroundColor: resolveTagColor(tag.color) }}
                    />
                    <span className="font-medium">{tag.tag}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {onEditTag && (
                      <SymbolTooltip label={`Edit tag ${tag.tag}`}>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          aria-label={`Edit tag ${tag.tag}`}
                          onClick={() => onStartEditing(tag)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </SymbolTooltip>
                    )}
                    <SymbolTooltip label={`Delete tag ${tag.tag}`}>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        aria-label={`Delete tag ${tag.tag}`}
                        onClick={() => onRemoveTag(tag.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </SymbolTooltip>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </ScrollArea>
  );
}

// ---------------------------------------------------------------------------
// PresetsTab
// ---------------------------------------------------------------------------

export interface PresetsTabProps {
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
  return (
    <ScrollArea className="h-[300px] pr-4">
      {searchQuery && filteredPresets.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No presets match &quot;{searchQuery}&quot;
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedPresets).map(([category, categoryTags]) => {
            const visibleTags = searchQuery
              ? categoryTags.filter((t) =>
                  t.tag.toLowerCase().includes(searchQuery.toLowerCase()),
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

export interface CustomTagTabProps {
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
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Tag name</Label>
        <Input
          placeholder="Tag name"
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
          Tag Color
        </Label>
        <div className="flex items-center gap-3">
          <ColorSwatchButton
            color={newColor}
            label={`Choose color (currently ${getTagColorName(newColor)})`}
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
          <Label>Preview</Label>
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
        Add Tag
      </Button>

      {hasTag(newTag) && newTag.trim() && (
        <p className="text-sm text-destructive text-center">
          This tag already exists
        </p>
      )}
    </div>
  );
}
