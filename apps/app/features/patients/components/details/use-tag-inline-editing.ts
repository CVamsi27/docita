"use client";

import { useState } from "react";
import type { PatientTag } from "./patient-tag.types";

/**
 * Owns the "edit an existing tag" flow for the tag manager dialog: which tag
 * (if any) is being edited, its draft name/color, that row's own color
 * picker, and the start/cancel/save mutations. Independent of search/create
 * state — a tag can be edited regardless of what's currently filtered.
 */
export function useTagInlineEditing(
  onEditTag?: (tagId: string, newName: string, newColor: string) => void,
) {
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editTagName, setEditTagName] = useState("");
  const [editTagColor, setEditTagColor] = useState("");
  const [editShowColorPicker, setEditShowColorPicker] = useState(false);

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

  const toggleEditColorPicker = () => setEditShowColorPicker((v) => !v);
  const selectEditColor = (color: string) => {
    setEditTagColor(color);
    setEditShowColorPicker(false);
  };

  return {
    editingTagId,
    editTagName,
    editTagColor,
    editShowColorPicker,
    setEditTagName,
    toggleEditColorPicker,
    selectEditColor,
    startEditing,
    cancelEditing,
    saveEdit,
  };
}
