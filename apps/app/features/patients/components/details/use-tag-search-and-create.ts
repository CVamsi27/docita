"use client";

import { useMemo, useState } from "react";
import { groupPresetTags } from "./patient-tag-manager-helpers";
import type { PatientTag, PresetTag } from "./patient-tag.types";

/**
 * Owns the "find and add tags" flow for the tag manager dialog: the search
 * query and its filtered current-tag/preset lists, and the custom-tag draft's
 * color picker and submit guard. Independent of the inline-edit flow — search
 * results stay stable while a tag is being edited.
 */
export function useTagSearchAndCreate(params: {
  tags: PatientTag[];
  presetTags: PresetTag[];
  newTag: string;
  newColor: string;
  hasTag: (tagName: string) => boolean;
  onAddTag: (tag: string, color: string) => void;
  onNewColorChange: (color: string) => void;
}) {
  const { tags, presetTags, newTag, newColor, hasTag, onAddTag, onNewColorChange } = params;

  const [searchQuery, setSearchQuery] = useState("");
  const [showColorPicker, setShowColorPicker] = useState(false);

  const groupedPresets = useMemo(() => groupPresetTags(presetTags), [presetTags]);

  const filteredTags = useMemo(() => {
    if (!searchQuery.trim()) return tags;
    return tags.filter((tag) => tag.tag.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [tags, searchQuery]);

  const filteredPresets = useMemo(() => {
    if (!searchQuery.trim()) return presetTags;
    return presetTags.filter((tag) => tag.tag.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [presetTags, searchQuery]);

  const clearSearch = () => setSearchQuery("");
  const toggleColorPicker = () => setShowColorPicker((v) => !v);
  const selectNewColor = (color: string) => {
    onNewColorChange(color);
    setShowColorPicker(false);
  };

  const handleAddCustomTag = () => {
    if (newTag.trim() && !hasTag(newTag)) {
      onAddTag(newTag.trim(), newColor);
      setShowColorPicker(false);
    }
  };

  return {
    searchQuery,
    setSearchQuery,
    clearSearch,
    filteredTags,
    filteredPresets,
    groupedPresets,
    showColorPicker,
    toggleColorPicker,
    selectNewColor,
    handleAddCustomTag,
  };
}
