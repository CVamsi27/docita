import { resolveTagColor } from "./tag-colors";
import { Button, Input, ScrollArea, SymbolTooltip } from "@workspace/ui/components";
import { Check, Pencil, Trash2, X } from "lucide-react";
import type { PatientTag } from "./patient-tag.types";
import { ColorSwatchButton, ColorPickerGrid } from "./patient-tag-color-pickers";

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
