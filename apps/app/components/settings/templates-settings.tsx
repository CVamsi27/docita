"use client"

import { useState, useEffect } from "react"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@workspace/ui/components/card"
import { Plus, Trash2, Save, Loader2, FileText, Settings2 } from "lucide-react"
import { API_URL } from "@/lib/api"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select"
import { Textarea } from "@workspace/ui/components/textarea"

interface TemplateField {
  id: string
  label: string
  type: "text" | "number" | "select" | "checkbox"
  options?: string // Comma separated for select
}

interface Template {
  id: string
  name: string
  speciality: string
  fields: TemplateField[]
  defaultObservations: string
}

export function TemplatesSettings() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // Editor State
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<Partial<Template>>({
    name: "",
    speciality: "General",
    fields: [],
    defaultObservations: ""
  })

  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    try {
      const res = await fetch(`${API_URL}/templates`)
      if (res.ok) {
        const data = await res.json()
        setTemplates(data)
      }
    } catch (error) {
      console.error("Failed to fetch templates", error)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (template: Template) => {
    setEditingId(template.id)
    setFormData({
      name: template.name,
      speciality: template.speciality,
      fields: template.fields,
      defaultObservations: template.defaultObservations || ""
    })
  }

  const handleNew = () => {
    setEditingId("new")
    setFormData({
      name: "",
      speciality: "General",
      fields: [],
      defaultObservations: ""
    })
  }

  const handleAddField = () => {
    const newField: TemplateField = {
      id: Math.random().toString(36).substr(2, 9),
      label: "New Field",
      type: "text"
    }
    setFormData({
      ...formData,
      fields: [...(formData.fields || []), newField]
    })
  }

  const updateField = (index: number, key: keyof TemplateField, value: string) => {
    const newFields = [...(formData.fields || [])]
    // Ensure the field exists before updating
    if (newFields[index]) {
      newFields[index] = { ...newFields[index], [key]: value }
      setFormData({ ...formData, fields: newFields })
    }
  }

  const removeField = (index: number) => {
    const newFields = [...(formData.fields || [])]
    newFields.splice(index, 1)
    setFormData({ ...formData, fields: newFields })
  }

  const handleSave = async () => {
    if (!formData.name) return
    setSaving(true)
    try {
      const url = editingId === "new" ? `${API_URL}/templates` : `${API_URL}/templates/${editingId}`
      const method = editingId === "new" ? "POST" : "PUT"
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      })

      if (res.ok) {
        setEditingId(null)
        fetchTemplates()
      }
    } catch (error) {
      console.error("Failed to save template", error)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return
    try {
      await fetch(`${API_URL}/templates/${id}`, { method: "DELETE" })
      fetchTemplates()
    } catch (error) {
      console.error("Failed to delete template", error)
    }
  }

  if (loading) return <div>Loading templates...</div>

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Clinical Templates</h3>
          <p className="text-sm text-muted-foreground">
            Customize consultation forms for different specialities.
          </p>
        </div>
        <Button onClick={handleNew} disabled={!!editingId}>
          <Plus className="mr-2 h-4 w-4" /> Create Template
        </Button>
      </div>

      {editingId ? (
        <Card>
          <CardHeader>
            <CardTitle>{editingId === "new" ? "New Template" : "Edit Template"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Template Name</Label>
                <Input 
                  value={formData.name} 
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g. Dental Checkup"
                />
              </div>
              <div className="space-y-2">
                <Label>Speciality</Label>
                <Select 
                  value={formData.speciality} 
                  onValueChange={(val) => setFormData({...formData, speciality: val})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="General">General Practice</SelectItem>
                    <SelectItem value="Dental">Dental</SelectItem>
                    <SelectItem value="Cardiology">Cardiology</SelectItem>
                    <SelectItem value="Pediatrics">Pediatrics</SelectItem>
                    <SelectItem value="Ophthalmology">Ophthalmology</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Default Observations</Label>
              <Textarea 
                value={formData.defaultObservations}
                onChange={(e) => setFormData({...formData, defaultObservations: e.target.value})}
                placeholder="Pre-filled text for observations..."
                rows={3}
              />
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label>Custom Fields</Label>
                <Button size="sm" variant="outline" onClick={handleAddField}>
                  <Plus className="mr-2 h-3 w-3" /> Add Field
                </Button>
              </div>
              
              {formData.fields?.length === 0 && (
                <div className="text-center p-8 border-2 border-dashed rounded-lg text-muted-foreground text-sm">
                  No custom fields added. The standard fields (Vitals, Diagnosis) will still appear.
                </div>
              )}

              {formData.fields?.map((field, idx) => (
                <div key={idx} className="flex gap-3 items-start p-3 bg-muted/30 rounded-md border">
                  <div className="flex-1 space-y-2">
                    <Input 
                      value={field.label} 
                      onChange={(e) => updateField(idx, "label", e.target.value)}
                      placeholder="Field Label"
                      className="h-8"
                    />
                  </div>
                  <div className="w-32 space-y-2">
                    <Select 
                      value={field.type} 
                      onValueChange={(val) => updateField(idx, "type", val)}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Text</SelectItem>
                        <SelectItem value="number">Number</SelectItem>
                        <SelectItem value="select">Dropdown</SelectItem>
                        <SelectItem value="checkbox">Checkbox</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {field.type === "select" && (
                    <div className="flex-1 space-y-2">
                      <Input 
                        value={field.options || ""} 
                        onChange={(e) => updateField(idx, "options", e.target.value)}
                        placeholder="Options (comma separated)"
                        className="h-8"
                      />
                    </div>
                  )}
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => removeField(idx)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Template
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Card key={template.id} className="hover:border-primary/50 transition-colors cursor-pointer group relative">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-base">{template.name}</CardTitle>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 -mt-1 -mr-2 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary"
                    onClick={(e) => { e.stopPropagation(); handleEdit(template); }}
                  >
                    <Settings2 className="h-4 w-4" />
                  </Button>
                </div>
                <CardDescription>{template.speciality}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  {template.fields.length} custom fields
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute bottom-3 right-3 h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => { e.stopPropagation(); handleDelete(template.id); }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
