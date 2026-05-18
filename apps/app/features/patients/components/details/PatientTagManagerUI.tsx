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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
import { SymbolTooltip } from "@workspace/ui/components/tooltip";
import { Search, Tag, X } from "lucide-react";
import { getTagColorName } from "./tag-colors";
import {
  CurrentTagsTab,
  CustomTagTab,
  PresetsTab,
  groupPresetTags,
} from "./patient-tag-manager-helpers";

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

  const groupedPresets = useMemo(() => groupPresetTags(presetTags), [presetTags]);

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
            Add tags to categorize and quickly identify patient conditions
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            placeholder="Enter tags"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={searchQuery.trim() ? "pl-9 pr-10" : "pl-9"}
            aria-label="Search tags"
          />
          {searchQuery && (
            <SymbolTooltip label="Clear search">
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
              >
                <X className="h-4 w-4" />
              </button>
            </SymbolTooltip>
          )}
        </div>

        <Tabs defaultValue="current" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="current">Current ({tags.length})</TabsTrigger>
            <TabsTrigger value="presets">Quick Add</TabsTrigger>
            <TabsTrigger value="custom">Custom</TabsTrigger>
          </TabsList>

          <TabsContent value="current" className="mt-4">
            <CurrentTagsTab
              filteredTags={filteredTags}
              searchQuery={searchQuery}
              editingTagId={editingTagId}
              editTagName={editTagName}
              editTagColor={editTagColor}
              editShowColorPicker={editShowColorPicker}
              onEditTagNameChange={setEditTagName}
              onToggleEditColorPicker={() => setEditShowColorPicker((v) => !v)}
              onSelectEditColor={(c) => {
                setEditTagColor(c);
                setEditShowColorPicker(false);
              }}
              onSaveEdit={saveEdit}
              onCancelEdit={cancelEditing}
              onStartEditing={startEditing}
              onRemoveTag={onRemoveTag}
              onEditTag={onEditTag}
              getTagColorName={getTagColorName}
            />
          </TabsContent>

          <TabsContent value="presets" className="mt-4">
            <PresetsTab
              searchQuery={searchQuery}
              filteredPresets={filteredPresets}
              groupedPresets={groupedPresets}
              hasTag={hasTag}
              onAddTag={onAddTag}
            />
          </TabsContent>

          <TabsContent value="custom" className="mt-4">
            <CustomTagTab
              newTag={newTag}
              newColor={newColor}
              loading={loading}
              showColorPicker={showColorPicker}
              onNewTagChange={onNewTagChange}
              onToggleColorPicker={() => setShowColorPicker((v) => !v)}
              onSelectNewColor={(c) => {
                onNewColorChange(c);
                setShowColorPicker(false);
              }}
              onAddCustomTag={handleAddCustomTag}
              hasTag={hasTag}
              getTagColorName={getTagColorName}
            />
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
