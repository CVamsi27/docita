"use client"

import { useState, useEffect } from "react"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Badge } from "@workspace/ui/components/badge"
import { Tag, X } from "lucide-react"
import { API_URL } from "@/lib/api"

interface PatientTagManagerProps {
  patientId: string
  onTagsUpdated?: () => void
}

interface PatientTag {
  id: string
  tag: string
  color: string
}

const PRESET_TAGS = [
  { tag: "Chronic", color: "#ef4444" },
  { tag: "Diabetic", color: "#f59e0b" },
  { tag: "Hypertensive", color: "#8b5cf6" },
  { tag: "Post-Surgery", color: "#06b6d4" },
  { tag: "Pregnant", color: "#ec4899" },
  { tag: "Elderly", color: "#64748b" },
  { tag: "Pediatric", color: "#10b981" },
]

export function PatientTagManager({ patientId, onTagsUpdated }: PatientTagManagerProps) {
  const [open, setOpen] = useState(false)
  const [tags, setTags] = useState<PatientTag[]>([])
  const [newTag, setNewTag] = useState("")
  const [newColor, setNewColor] = useState("#3b82f6")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      loadTags()
    }
  }, [open, patientId])

  const loadTags = async () => {
    try {
      const response = await fetch(`${API_URL}/patients/${patientId}/tags`)
      if (response.ok) {
        const data = await response.json()
        setTags(data)
      }
    } catch (error) {
      console.error("Failed to load tags:", error)
    }
  }

  const addTag = async (tag: string, color: string) => {
    setLoading(true)
    try {
      const response = await fetch(`${API_URL}/patients/${patientId}/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tag, color }),
      })

      if (response.ok) {
        await loadTags()
        setNewTag("")
        setNewColor("#3b82f6")
        onTagsUpdated?.()
      }
    } catch (error) {
      console.error("Failed to add tag:", error)
    } finally {
      setLoading(false)
    }
  }

  const removeTag = async (tagId: string) => {
    try {
      await fetch(`${API_URL}/patients/${patientId}/tags/${tagId}`, {
        method: "DELETE",
      })
      await loadTags()
      onTagsUpdated?.()
    } catch (error) {
      console.error("Failed to remove tag:", error)
    }
  }

  const hasTag = (tagName: string) => {
    return tags.some((t) => t.tag.toLowerCase() === tagName.toLowerCase())
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
                      onClick={() => removeTag(tag.id)}
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
              {PRESET_TAGS.map((preset) => (
                <Badge
                  key={preset.tag}
                  variant="outline"
                  style={{ borderColor: preset.color, color: preset.color }}
                  className={`cursor-pointer transition-all ${
                    hasTag(preset.tag) ? "opacity-50 cursor-not-allowed" : "hover:bg-accent"
                  }`}
                  onClick={() => !hasTag(preset.tag) && addTag(preset.tag, preset.color)}
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
                onChange={(e) => setNewTag(e.target.value)}
                className="flex-1"
              />
              <Input
                type="color"
                value={newColor}
                onChange={(e) => setNewColor(e.target.value)}
                className="w-16"
              />
              <Button
                onClick={() => addTag(newTag, newColor)}
                disabled={!newTag.trim() || loading || hasTag(newTag)}
              >
                Add
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
