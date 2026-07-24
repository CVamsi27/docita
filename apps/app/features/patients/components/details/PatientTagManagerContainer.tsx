"use client";

import { useEffect, useState } from "react";
import { type PatientTag, PatientTagManagerUI } from "./PatientTagManagerUI";
import { DEFAULT_TAG_COLOR_VAR } from "./tag-colors";
import { useClinicSettings, useCreatePatientTag, useDeletePatientTag, usePatientTags, useUpdatePatientTag } from "@workspace/data-access";
import { useTierFeatureEnabled } from "@/lib/access-control/use-tier-feature-enabled";
import { ClinicFeatureService } from "@/lib/services/clinic-feature.service";
import { Feature } from "@workspace/types";
import { resolveClinicTypeFeatures } from "@/features/consultation";
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
  const tierPatientsOk = useTierFeatureEnabled(
    Feature.BASIC_PATIENT_MANAGEMENT,
  );

  const { data: clinic } = useClinicSettings();
  const presetTags = ClinicFeatureService.getPresetTags(
    resolveClinicTypeFeatures(clinic?.type).key,
  );
  const tagsQuery = usePatientTags(patientId, { enabled: open && tierPatientsOk });
  const createTag = useCreatePatientTag(patientId);
  const updateTag = useUpdatePatientTag(patientId);
  const deleteTag = useDeletePatientTag(patientId);

  useEffect(() => {
    if (tagsQuery.data) {
      setTags(tagsQuery.data);
    }
  }, [tagsQuery.data]);

  const addTag = async (tag: string, color: string) => {
    if (!tierPatientsOk) return;
    try {
      await createTag.mutateAsync({ tag, color });
      setNewTag("");
      setNewColor(DEFAULT_TAG_COLOR_VAR);
      onTagsUpdated?.();
    } catch (err) {
      showUserFacingErrorToast(
        err,
        "We could not add this tag. Please try again.",
        "save",
      );
    }
  };

  const removeTag = async (tagId: string) => {
    if (!tierPatientsOk) return;
    const previousTags = [...tags];
    setTags(tags.filter((t) => t.id !== tagId));

    try {
      await deleteTag.mutateAsync({ tagId });
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
      await updateTag.mutateAsync({
        tagId,
        tag: newName,
        color: newTagColor,
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
      loading={tagsQuery.isLoading || createTag.isPending}
      onNewTagChange={setNewTag}
      onNewColorChange={setNewColor}
      onAddTag={addTag}
      onRemoveTag={removeTag}
      onEditTag={editTag}
      hasTag={hasTag}
    />
  );
}
