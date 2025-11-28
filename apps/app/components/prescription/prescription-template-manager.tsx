"use client"

import { useState, useEffect, useCallback, memo } from "react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@workspace/ui/components/dialog"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Plus, X, Save, Trash2, Edit } from "lucide-react"
import { API_URL } from "@/lib/api"
import type { Medication, PrescriptionTemplate } from "@/types"

interface PrescriptionTemplateManagerProps {
  onTemplateSelect?: (template: PrescriptionTemplate) => void
}

export const PrescriptionTemplateManager = memo(function PrescriptionTemplateManager({ 
  onTemplateSelect 
}: PrescriptionTemplateManagerProps) {
  const [open, setOpen] = useState(false)
  const [templates, setTemplates] = useState<PrescriptionTemplate[]>([])
  const [loading, setLoading] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<PrescriptionTemplate | null>(null)
  
  const [formData, setFormData] = useState({
    name: "",
    medications: [] as Medication[],
    instructions: ""
  })

  const loadTemplates = useCallback(async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem("docita_token")
      const response = await fetch(`${API_URL}/prescription-templates`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      
      if (response.ok) {
        const data = await response.json()
        setTemplates(data)
      }
    } catch (error) {
      console.error("Failed to load templates:", error)
      toast.error("Failed to load templates")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) {
      loadTemplates()
    }
  }, [open, loadTemplates])

  const handleSaveTemplate = useCallback(async () => {
    if (!formData.name || formData.medications.length === 0) {
      toast.error("Please provide a name and at least one medication")
      return
    }

    try {
      setLoading(true)
      const token = localStorage.getItem("docita_token")
      const url = editingTemplate 
        ? `${API_URL}/prescription-templates/${editingTemplate.id}`
        : `${API_URL}/prescription-templates`
      
      const response = await fetch(url, {
        method: editingTemplate ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        toast.success(editingTemplate ? "Template updated" : "Template created")
        loadTemplates()
        resetForm()
      } else {
        throw new Error("Failed to save template")
      }
    } catch (error) {
      console.error("Failed to save template:", error)
      toast.error("Failed to save template")
    } finally {
      setLoading(false)
    }
  }, [editingTemplate, formData, loadTemplates])

  const handleDeleteTemplate = useCallback(async (id: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return

    try {
      const token = localStorage.getItem("docita_token")
      const response = await fetch(`${API_URL}/prescription-templates/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        toast.success("Template deleted")
        loadTemplates()
      }
    } catch (error) {
      console.error("Failed to delete template:", error)
      toast.error("Failed to delete template")
    }
  }, [loadTemplates])

  const handleEditTemplate = useCallback((template: PrescriptionTemplate) => {
    setEditingTemplate(template)
    setFormData({
      name: template.name,
      medications: template.medications,
      instructions: template.instructions || ""
    })
  }, [])

  const resetForm = useCallback(() => {
    setFormData({
      name: "",
      medications: [],
      instructions: ""
    })
    setEditingTemplate(null)
  }, [])

  const addMedication = useCallback(() => {
    setFormData(prev => ({
      ...prev,
      medications: [...prev.medications, { name: "", dosage: "", frequency: "", duration: "" }]
    }))
  }, [])

  const removeMedication = useCallback((index: number) => {
    setFormData(prev => ({
      ...prev,
      medications: prev.medications.filter((_, i) => i !== index)
    }))
  }, [])

  const updateMedication = useCallback((index: number, field: keyof Medication, value: string) => {
    setFormData(prev => {
      const updated = [...prev.medications]
      updated[index] = { ...updated[index], [field]: value } as Medication
      return { ...prev, medications: updated }
    })
  }, [])

  const handleUseTemplate = useCallback((template: PrescriptionTemplate) => {
    if (onTemplateSelect) {
      onTemplateSelect(template)
      setOpen(false)
      toast.success("Template applied")
    }
  }, [onTemplateSelect])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Manage Templates
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Prescription Templates</DialogTitle>
          <DialogDescription>
            Create and manage reusable prescription templates
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Template List */}
          <div className="space-y-4">
            <h3 className="font-medium">Saved Templates</h3>
            {loading && templates.length === 0 ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : templates.length === 0 ? (
              <p className="text-sm text-muted-foreground">No templates yet</p>
            ) : (
              <div className="space-y-2">
                {templates.map((template) => (
                  <div key={template.id} className="p-3 border rounded-lg space-y-2 hover:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium">{template.name}</h4>
                        <p className="text-xs text-muted-foreground">
                          {template.medications.length} medication(s)
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUseTemplate(template)}
                          className="h-8 px-2"
                        >
                          Use
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditTemplate(template)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteTemplate(template.id)}
                          className="h-8 w-8 p-0 text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Template Form */}
          <div className="space-y-4">
            <h3 className="font-medium">{editingTemplate ? "Edit Template" : "New Template"}</h3>
            
            <div className="space-y-2">
              <Label>Template Name</Label>
              <Input
                placeholder="e.g., Common Cold Treatment"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Medications</Label>
                <Button type="button" variant="outline" size="sm" onClick={addMedication}>
                  <Plus className="h-3 w-3 mr-1" />
                  Add
                </Button>
              </div>
              
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {formData.medications.map((med, index) => (
                  <div key={index} className="p-3 border rounded-lg space-y-2 relative">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeMedication(index)}
                      className="absolute right-1 top-1 h-6 w-6 p-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                    
                    <Input
                      placeholder="Medicine name"
                      value={med.name}
                      onChange={(e) => updateMedication(index, "name", e.target.value)}
                      className="text-sm"
                    />
                    <div className="grid grid-cols-3 gap-2">
                      <Input
                        placeholder="Dosage"
                        value={med.dosage}
                        onChange={(e) => updateMedication(index, "dosage", e.target.value)}
                        className="text-sm"
                      />
                      <Input
                        placeholder="Frequency"
                        value={med.frequency}
                        onChange={(e) => updateMedication(index, "frequency", e.target.value)}
                        className="text-sm"
                      />
                      <Input
                        placeholder="Duration"
                        value={med.duration}
                        onChange={(e) => updateMedication(index, "duration", e.target.value)}
                        className="text-sm"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Instructions</Label>
              <Input
                placeholder="e.g., Take after meals"
                value={formData.instructions}
                onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSaveTemplate} disabled={loading} className="flex-1">
                <Save className="h-4 w-4 mr-2" />
                {editingTemplate ? "Update" : "Save"} Template
              </Button>
              {editingTemplate && (
                <Button variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
})
