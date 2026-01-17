/**
 * Patient Tag Manager - Container Component
 * Handles tag data fetching and management logic
 */

import { useCallback, useRef, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import {
  type PatientTag,
  PatientTagManagerUI,
  type PresetTag,
} from "./PatientTagManagerUI";

const PRESET_TAGS: PresetTag[] = [
  { tag: "Chronic", color: "#ef4444" },
  { tag: "Diabetic", color: "#f59e0b" },
  { tag: "Hypertensive", color: "#8b5cf6" },
  { tag: "Post-Surgery", color: "#06b6d4" },
  { tag: "Pregnant", color: "#ec4899" },
  { tag: "Elderly", color: "#64748b" },
  { tag: "Pediatric", color: "#10b981" },
];

interface PatientTagManagerContainerProps {
  patientId: string;
  onTagsUpdated?: () => void;
}

export function PatientTagManagerContainer({
  patientId,
  onTagsUpdated,
}: PatientTagManagerContainerProps) {
  const [open, setOpen] = useState(false);
  const [tags, setTags] = useState<PatientTag[]>([]);
  const [newTag, setNewTag] = useState("");
  const [newColor, setNewColor] = useState("#3b82f6");
  const [loading, setLoading] = useState(false);

  const loadTags = useCallback(async () => {
    try {
      const data = await apiFetch<PatientTag[]>(`/patients/${patientId}/tags`);
      setTags(data);
    } catch (error) {
      console.error("Failed to load tags:", error);
    }
  }, [patientId]);

  // Load tags when dialog opens or patientId changes
  const lastStateRef = useRef({ open: false, patientId: "" });
  if (
    open &&
    (lastStateRef.current.open !== open ||
      lastStateRef.current.patientId !== patientId)
  ) {
    loadTags();
  }
  lastStateRef.current = { open, patientId };

  const addTag = async (tag: string, color: string) => {
    setLoading(true);
    try {
      await apiFetch(`/patients/${patientId}/tags`, {
        method: "POST",
        body: JSON.stringify({ tag, color }),
      });
      await loadTags();
      setNewTag("");
      setNewColor("#3b82f6");
      onTagsUpdated?.();
    } catch (error) {
      console.error("Failed to add tag:", error);
    } finally {
      setLoading(false);
    }
  };

  const removeTag = async (tagId: string) => {
    try {
      await apiFetch(`/patients/${patientId}/tags/${tagId}`, {
        method: "DELETE",
      });
      await loadTags();
      onTagsUpdated?.();
    } catch (error) {
      console.error("Failed to remove tag:", error);
    }
  };

  const hasTag = (tagName: string) => {
    return tags.some((t) => t.tag.toLowerCase() === tagName.toLowerCase());
  };

  return (
    <PatientTagManagerUI
      open={open}
      onOpenChange={setOpen}
      tags={tags}
      presetTags={PRESET_TAGS}
      newTag={newTag}
      newColor={newColor}
      loading={loading}
      onNewTagChange={setNewTag}
      onNewColorChange={setNewColor}
      onAddTag={addTag}
      onRemoveTag={removeTag}
      hasTag={hasTag}
    />
  );
}
