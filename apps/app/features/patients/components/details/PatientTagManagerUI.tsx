import { useMemo, useState } from "react";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Badge } from "@workspace/ui/components/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import {
  Check,
  Palette,
  Pencil,
  Plus,
  Search,
  Tag,
  Trash2,
  X,
} from "lucide-react";

export interface PatientTag {
  id: string;
  tag: string;
  color: string;
}

export interface PresetTag {
  tag: string;
  color: string;
  category?: string;
}

interface PatientTagManagerUIProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tags: PatientTag[];
  presetTags: PresetTag[];
  newTag: string;
  newColor: string;
  loading: boolean;
  onNewTagChange: (tag: string) => void;
  onNewColorChange: (color: string) => void;
  onAddTag: (tag: string, color: string) => void;
  onRemoveTag: (tagId: string) => void;
  onEditTag?: (tagId: string, newName: string, newColor: string) => void;
  hasTag: (tagName: string) => boolean;
}

const COLOR_PALETTE = [
  { name: "Red", value: "#ef4444" },
  { name: "Orange", value: "#f97316" },
  { name: "Amber", value: "#f59e0b" },
  { name: "Yellow", value: "#eab308" },
  { name: "Lime", value: "#84cc16" },
  { name: "Green", value: "#22c55e" },
  { name: "Emerald", value: "#10b981" },
  { name: "Teal", value: "#14b8a6" },
  { name: "Cyan", value: "#06b6d4" },
  { name: "Sky", value: "#0ea5e9" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Indigo", value: "#6366f1" },
  { name: "Violet", value: "#8b5cf6" },
  { name: "Purple", value: "#a855f7" },
  { name: "Fuchsia", value: "#d946ef" },
  { name: "Pink", value: "#ec4899" },
  { name: "Rose", value: "#f43f5e" },
  { name: "Slate", value: "#64748b" },
];

function groupPresetTags(presetTags: PresetTag[]): Record<string, PresetTag[]> {
  const groups: Record<string, PresetTag[]> = {};

  for (const tag of presetTags) {
    const category = tag.category || "General";
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(tag);
  }

  return groups;
}

export function PatientTagManagerUI({
  open,
  onOpenChange,
  tags,
  presetTags,
  newTag,
  newColor,
  loading,
  onNewTagChange,
  onNewColorChange,
  onAddTag,
  onRemoveTag,
  onEditTag,
  hasTag,
}: PatientTagManagerUIProps) {
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editTagName, setEditTagName] = useState("");
  const [editTagColor, setEditTagColor] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [editShowColorPicker, setEditShowColorPicker] = useState(false);

  const groupedPresets = useMemo(
    () => groupPresetTags(presetTags),
    [presetTags],
  );

  const filteredTags = useMemo(() => {
    if (!searchQuery.trim()) return tags;
    return tags.filter((tag) =>
      tag.tag.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [tags, searchQuery]);

  const filteredPresets = useMemo(() => {
    if (!searchQuery.trim()) return presetTags;
    return presetTags.filter((tag) =>
      tag.tag.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [presetTags, searchQuery]);

  const startEditing = (tag: PatientTag) => {
    setEditingTagId(tag.id);
    setEditTagName(tag.tag);
    setEditTagColor(tag.color);
    setEditShowColorPicker(false);
  };

  const cancelEditing = () => {
    setEditingTagId(null);
    setEditTagName("");
    setEditTagColor("");
    setEditShowColorPicker(false);
  };

  const saveEdit = () => {
    if (editingTagId && editTagName.trim() && onEditTag) {
      onEditTag(editingTagId, editTagName.trim(), editTagColor);
      cancelEditing();
    }
  };

  const handleAddCustomTag = () => {
    if (newTag.trim() && !hasTag(newTag)) {
      onAddTag(newTag.trim(), newColor);
      setShowColorPicker(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Tag className="h-4 w-4" />
          Manage Tags
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-primary" />
            Patient Tags
          </DialogTitle>
          <DialogDescription>
            Add tags to categorize and quickly identify patient conditions.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <Tabs defaultValue="current" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="current">Current ({tags.length})</TabsTrigger>
            <TabsTrigger value="presets">Quick Add</TabsTrigger>
            <TabsTrigger value="custom">Custom</TabsTrigger>
          </TabsList>

          <TabsContent value="current" className="mt-4">
            <ScrollArea className="h-[300px] pr-4">
              {filteredTags.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {searchQuery ? (
                    <p>No tags match &quot;{searchQuery}&quot;</p>
                  ) : (
                    <p>No tags added yet. Add from presets or create custom.</p>
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
                            onChange={(e) => setEditTagName(e.target.value)}
                            className="h-8 flex-1"
                            autoFocus
                          />
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() =>
                                setEditShowColorPicker(!editShowColorPicker)
                              }
                              className="h-8 w-8 rounded-md border-2 border-border"
                              style={{ backgroundColor: editTagColor }}
                            />
                            {editShowColorPicker && (
                              <div className="absolute top-10 right-0 z-50 p-2 bg-popover border rounded-lg shadow-lg">
                                <div className="grid grid-cols-6 gap-1">
                                  {COLOR_PALETTE.map((color) => (
                                    <Tooltip key={color.value}>
                                      <TooltipTrigger asChild>
                                          <button
                                            type="button"
                                            className={`h-6 w-6 rounded-md transition-colors duration-150 ${
                                              editTagColor === color.value
                                                ? "ring-2 ring-primary ring-offset-2"
                                                : "hover:opacity-80"
                                            }`}
                                            style={{
                                              backgroundColor: color.value,
                                            }}
                                            onClick={() => {
                                              setEditTagColor(color.value);
                                              setEditShowColorPicker(false);
                                            }}
                                          />
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        {color.name}
                                      </TooltipContent>
                                    </Tooltip>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={saveEdit}
                          >
                            <Check className="h-4 w-4 text-success" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={cancelEditing}
                          >
                            <X className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-3">
                            <div
                              className="h-4 w-4 rounded-full border"
                              style={{ backgroundColor: tag.color }}
                            />
                            <span className="font-medium">{tag.tag}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            {onEditTag && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0"
                                onClick={() => startEditing(tag)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                              onClick={() => onRemoveTag(tag.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="presets" className="mt-4">
            <ScrollArea className="h-[300px] pr-4">
              {searchQuery && filteredPresets.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No presets match &quot;{searchQuery}&quot;
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(groupedPresets).map(
                    ([category, categoryTags]) => {
                      const visibleTags = searchQuery
                        ? categoryTags.filter((t) =>
                            t.tag
                              .toLowerCase()
                              .includes(searchQuery.toLowerCase()),
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
                              return (
                                <Badge
                                  key={preset.tag}
                                  variant="outline"
                                  style={{
                                    borderColor: preset.color,
                                    color: isAdded ? "#888" : preset.color,
                                    opacity: isAdded ? 0.5 : 1,
                                  }}
                                  className={`cursor-pointer transition-colors duration-150 ${
                                    isAdded
                                      ? "cursor-not-allowed"
                                      : "hover:bg-accent"
                                  }`}
                                  onClick={() =>
                                    !isAdded &&
                                    onAddTag(preset.tag, preset.color)
                                  }
                                >
                                  {isAdded && (
                                    <Check className="h-3 w-3 mr-1" />
                                  )}
                                  {preset.tag}
                                </Badge>
                              );
                            })}
                          </div>
                        </div>
                      );
                    },
                  )}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="custom" className="mt-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Tag Name</Label>
                <Input
                  placeholder="Enter tag name..."
                  value={newTag}
                  onChange={(e) => onNewTagChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddCustomTag();
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
                  <button
                    type="button"
                    onClick={() => setShowColorPicker(!showColorPicker)}
                    className="h-10 w-10 rounded-lg border-2 border-border shadow-sm"
                    style={{ backgroundColor: newColor }}
                  />
                  <span className="text-sm text-muted-foreground">
                    {COLOR_PALETTE.find((c) => c.value === newColor)?.name ||
                      "Custom"}
                  </span>
                </div>

                {showColorPicker && (
                  <div className="p-3 border rounded-lg bg-card mt-2">
                    <div className="grid grid-cols-9 gap-2">
                      {COLOR_PALETTE.map((color) => (
                        <Tooltip key={color.value}>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              className={`h-8 w-8 rounded-md transition-colors duration-150 ${
                                newColor === color.value
                                  ? "ring-2 ring-primary ring-offset-2"
                                  : "hover:opacity-80"
                              }`}
                              style={{ backgroundColor: color.value }}
                              onClick={() => {
                                onNewColorChange(color.value);
                                setShowColorPicker(false);
                              }}
                            />
                          </TooltipTrigger>
                          <TooltipContent>{color.name}</TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <Label className="text-xs">Custom:</Label>
                      <Input
                        type="color"
                        value={newColor}
                        onChange={(e) => onNewColorChange(e.target.value)}
                        className="h-8 w-16 p-0 border-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              {newTag.trim() && (
                <div className="space-y-2">
                  <Label>Preview</Label>
                  <Badge
                    style={{ backgroundColor: newColor }}
                    className="text-white"
                  >
                    {newTag}
                  </Badge>
                </div>
              )}

              <Button
                onClick={handleAddCustomTag}
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
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
