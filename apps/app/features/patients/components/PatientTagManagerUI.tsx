/**
 * Patient Tag Manager - UI Component
 * Pure presentational component for managing patient tags
 */

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
import { Tag, X } from "lucide-react";

export interface PatientTag {
  id: string;
  tag: string;
  color: string;
}

export interface PresetTag {
  tag: string;
  color: string;
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
  hasTag,
}: PatientTagManagerUIProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Tag className="h-4 w-4" />
          Manage Tags
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Patient Tags</DialogTitle>
          <DialogDescription>
            Add tags to categorize and quickly identify patient conditions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current Tags */}
          {tags.length > 0 && (
            <div className="space-y-2">
              <Label>Current Tags</Label>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Badge
                    key={tag.id}
                    style={{ backgroundColor: tag.color }}
                    className="text-white border-0 gap-1"
                  >
                    {tag.tag}
                    <button
                      onClick={() => onRemoveTag(tag.id)}
                      className="ml-1 hover:bg-white/20 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Preset Tags */}
          <div className="space-y-2">
            <Label>Quick Add</Label>
            <div className="flex flex-wrap gap-2">
              {presetTags.map((preset) => (
                <Badge
                  key={preset.tag}
                  variant="outline"
                  style={{ borderColor: preset.color, color: preset.color }}
                  className={`cursor-pointer transition-all ${
                    hasTag(preset.tag)
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:bg-accent"
                  }`}
                  onClick={() =>
                    !hasTag(preset.tag) && onAddTag(preset.tag, preset.color)
                  }
                >
                  {preset.tag}
                </Badge>
              ))}
            </div>
          </div>

          {/* Custom Tag */}
          <div className="space-y-3 pt-2 border-t">
            <Label>Add Custom Tag</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Tag name"
                value={newTag}
                onChange={(e) => onNewTagChange(e.target.value)}
                className="flex-1"
              />
              <Input
                type="color"
                value={newColor}
                onChange={(e) => onNewColorChange(e.target.value)}
                className="w-16"
              />
              <Button
                onClick={() => onAddTag(newTag, newColor)}
                disabled={!newTag.trim() || loading || hasTag(newTag)}
              >
                Add
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
