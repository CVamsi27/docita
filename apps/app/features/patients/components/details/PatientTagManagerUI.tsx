"use client";

import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components";
import { Tag } from "lucide-react";
import { getTagColorName } from "./tag-colors";
import type { PatientTag, PresetTag } from "./patient-tag.types";
import { CurrentTagsTab, CustomTagTab, PresetsTab } from "./patient-tag-manager-helpers";
import { TagSearchField } from "./patient-tag-search-field";
import { useTagInlineEditing } from "./use-tag-inline-editing";
import { useTagSearchAndCreate } from "./use-tag-search-and-create";

export type { PatientTag, PresetTag };

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
  const editing = useTagInlineEditing(onEditTag);
  const search = useTagSearchAndCreate({
    tags,
    presetTags,
    newTag,
    newColor,
    hasTag,
    onAddTag,
    onNewColorChange,
  });

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

        <TagSearchField value={search.searchQuery} onChange={search.setSearchQuery} onClear={search.clearSearch} />

        <Tabs defaultValue="current" className="w-full">
          <TabsList className="flex w-full overflow-x-auto overscroll-x-contain [scrollbar-width:thin] max-md:flex-nowrap md:grid md:grid-cols-3">
            <TabsTrigger value="current">Current ({tags.length})</TabsTrigger>
            <TabsTrigger value="presets">Quick add</TabsTrigger>
            <TabsTrigger value="custom">Custom</TabsTrigger>
          </TabsList>

          <TabsContent value="current" className="mt-4">
            <CurrentTagsTab
              filteredTags={search.filteredTags}
              searchQuery={search.searchQuery}
              editingTagId={editing.editingTagId}
              editTagName={editing.editTagName}
              editTagColor={editing.editTagColor}
              editShowColorPicker={editing.editShowColorPicker}
              onEditTagNameChange={editing.setEditTagName}
              onToggleEditColorPicker={editing.toggleEditColorPicker}
              onSelectEditColor={editing.selectEditColor}
              onSaveEdit={editing.saveEdit}
              onCancelEdit={editing.cancelEditing}
              onStartEditing={editing.startEditing}
              onRemoveTag={onRemoveTag}
              onEditTag={onEditTag}
              getTagColorName={getTagColorName}
            />
          </TabsContent>

          <TabsContent value="presets" className="mt-4">
            <PresetsTab
              searchQuery={search.searchQuery}
              filteredPresets={search.filteredPresets}
              groupedPresets={search.groupedPresets}
              hasTag={hasTag}
              onAddTag={onAddTag}
            />
          </TabsContent>

          <TabsContent value="custom" className="mt-4">
            <CustomTagTab
              newTag={newTag}
              newColor={newColor}
              loading={loading}
              showColorPicker={search.showColorPicker}
              onNewTagChange={onNewTagChange}
              onToggleColorPicker={search.toggleColorPicker}
              onSelectNewColor={search.selectNewColor}
              onAddCustomTag={search.handleAddCustomTag}
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
