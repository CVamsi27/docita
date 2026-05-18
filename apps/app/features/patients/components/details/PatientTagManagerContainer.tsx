"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api/api-client";
import { type PatientTag, PatientTagManagerUI } from "./PatientTagManagerUI";
import { DEFAULT_TAG_COLOR_VAR } from "./tag-colors";
import { useClinicSettings } from "@workspace/data-access";
import { useTierFeatureEnabled } from "@/lib/access-control/use-tier-feature-enabled";
import { ClinicFeatureService } from "@/lib/services/clinic-feature.service";
import { Feature, type ClinicType } from "@workspace/types";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";

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
  const [newColor, setNewColor] = useState(DEFAULT_TAG_COLOR_VAR);
  const [loading, setLoading] = useState(false);
  const tierPatientsOk = useTierFeatureEnabled(Feature.BASIC_PATIENT_MANAGEMENT);

  const { data: clinic } = useClinicSettings();
  const presetTags = ClinicFeatureService.getPresetTags(
    clinic?.type as ClinicType | undefined,
  );

  const loadTags = useCallback(async () => {
    if (!tierPatientsOk) return;
    try {
      const data = await apiFetch<PatientTag[]>(`/patients/${patientId}/tags`);
      setTags(data);
    } catch (err) {
      showUserFacingErrorToast(
        err,
        "We could not load these tags. Please try again.",
        "generic",
      );
    }
  }, [patientId, tierPatientsOk]);

  useEffect(() => {
    if (!open || !tierPatientsOk) return;
    void loadTags();
  }, [open, tierPatientsOk, loadTags]);

  const addTag = async (tag: string, color: string) => {
    if (!tierPatientsOk) return;
    setLoading(true);
    try {
      await apiFetch(`/patients/${patientId}/tags`, {
        method: "POST",
        body: JSON.stringify({ tag, color }),
      });
      await loadTags();
      setNewTag("");
      setNewColor(DEFAULT_TAG_COLOR_VAR);
      onTagsUpdated?.();
    } catch (err) {
      showUserFacingErrorToast(
        err,
        "We could not add this tag. Please try again.",
        "save",
      );
    } finally {
      setLoading(false);
    }
  };

  const removeTag = async (tagId: string) => {
    if (!tierPatientsOk) return;
    const previousTags = [...tags];
    setTags(tags.filter((t) => t.id !== tagId));

    try {
      await apiFetch(`/patients/${patientId}/tags/${tagId}`, {
        method: "DELETE",
      });
      onTagsUpdated?.();
    } catch (err) {
      showUserFacingErrorToast(
        err,
        "We could not remove this tag. Please try again.",
        "save",
      );
      setTags(previousTags);
    }
  };

  const editTag = async (
    tagId: string,
    newName: string,
    newTagColor: string,
  ) => {
    if (!tierPatientsOk) return;
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
    } catch (err) {
      showUserFacingErrorToast(
        err,
        "We could not save this tag. Please try again.",
        "save",
      );
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
