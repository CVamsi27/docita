import { useCallback, useRef, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { type PatientTag, PatientTagManagerUI } from "./PatientTagManagerUI";
import { useClinicSettings } from "@/hooks/api/use-settings";
import { ClinicFeatureService } from "@/lib/services/clinic-feature.service";
import { toast } from "sonner";
import type { ClinicType } from "@workspace/types";

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

  const { data: clinic } = useClinicSettings();
  const presetTags = ClinicFeatureService.getPresetTags(
    clinic?.type as ClinicType | undefined,
  );

  const loadTags = useCallback(async () => {
    try {
      const data = await apiFetch<PatientTag[]>(`/patients/${patientId}/tags`);
      setTags(data);
    } catch {
      toast.error("Failed to load tags");
    }
  }, [patientId]);

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
    } catch {
      toast.error("Failed to add tag");
    } finally {
      setLoading(false);
    }
  };

  const removeTag = async (tagId: string) => {
    const previousTags = [...tags];
    setTags(tags.filter((t) => t.id !== tagId));

    try {
      await apiFetch(`/patients/${patientId}/tags/${tagId}`, {
        method: "DELETE",
      });
      onTagsUpdated?.();
    } catch {
      toast.error("Failed to remove tag");
      setTags(previousTags);
    }
  };

  const editTag = async (
    tagId: string,
    newName: string,
    newTagColor: string,
  ) => {
    const previousTags = [...tags];
    setTags(
      tags.map((t) =>
        t.id === tagId ? { ...t, tag: newName, color: newTagColor } : t,
      ),
    );

    try {
      await apiFetch(`/patients/${patientId}/tags/${tagId}`, {
        method: "PATCH",
        body: JSON.stringify({ tag: newName, color: newTagColor }),
      });
      onTagsUpdated?.();
    } catch {
      toast.error("Failed to update tag");
      setTags(previousTags);
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
      presetTags={presetTags}
      newTag={newTag}
      newColor={newColor}
      loading={loading}
      onNewTagChange={setNewTag}
      onNewColorChange={setNewColor}
      onAddTag={addTag}
      onRemoveTag={removeTag}
      onEditTag={editTag}
      hasTag={hasTag}
    />
  );
}
