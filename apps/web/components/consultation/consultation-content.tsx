"use client"

import { useState, useEffect } from "react"
import { Button } from "@workspace/ui/components/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Textarea } from "@workspace/ui/components/textarea"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@workspace/ui/components/select"
import { 
  Activity, 
  Pill, 
  Receipt, 
  FileText, 
  Plus, 
  X,
  Save,
  CheckCircle2
} from "lucide-react"
import { useObservationsForm } from "@/hooks/use-observations-form"
import { useVitalsForm } from "@/hooks/use-vitals-form"
import { usePrescriptionForm } from "@/hooks/use-prescription-form"
import { useInvoiceForm } from "@/hooks/use-invoice-form"
import { MedicineAutocomplete } from "@/components/medicines/medicine-autocomplete"
import { API_URL } from "@/lib/api"
import { Checkbox } from "@workspace/ui/components/checkbox"

interface ConsultationContentProps {
  appointmentId: string
  patientId: string
  doctorId: string
  defaultTab?: "observations" | "vitals" | "prescription" | "invoice"
  onSave?: () => void
}

export function ConsultationContent({ 
  appointmentId, 
  patientId, 
  doctorId, 
  defaultTab = "observations",
  onSave
}: ConsultationContentProps) {
  const [activeTab, setActiveTab] = useState(defaultTab)

  // Template State
  const [templates, setTemplates] = useState<any[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("")
  const [dynamicFields, setDynamicFields] = useState<Record<string, string>>({})

  useEffect(() => {
    loadTemplates()
  }, [])

  const loadTemplates = async () => {
    try {
      const res = await fetch(`${API_URL}/templates`)
      if (res.ok) {
        const data = await res.json()
        setTemplates(data)
      }
    } catch (error) {
      console.error("Failed to load templates", error)
    }
  }

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId)
    const template = templates.find(t => t.id === templateId)
    if (template) {
      // Pre-fill observations if empty
      if (!observations && template.defaultObservations) {
        setObservations(template.defaultObservations)
      }
      // Reset dynamic fields
      setDynamicFields({})
    }
  }

  const handleDynamicFieldChange = (label: string, value: string) => {
    setDynamicFields(prev => ({ ...prev, [label]: value }))
  }

  // Intercept save to append dynamic fields
  const handleSaveObservations = (e: React.FormEvent) => {
    e.preventDefault()
    
    let finalObservations = observations
    if (Object.keys(dynamicFields).length > 0) {
      const dynamicText = Object.entries(dynamicFields)
        .map(([label, value]) => `${label}: ${value}`)
        .join("\n")
      
      if (finalObservations) {
        finalObservations += "\n\n-- Clinical Data --\n" + dynamicText
      } else {
        finalObservations = dynamicText
      }
    }
    
    setObservations(finalObservations)
    setTimeout(() => handleObsSubmit(e), 0)
  }

  // Observations Hook
  const {
    loading: obsLoading,
    observations,
    setObservations,
    handleSubmit: handleObsSubmit
  } = useObservationsForm({
    appointmentId,
    onObservationsSaved: onSave
  })

  // Vitals Hook
  const {
    loading: vitalsLoading,
    formData: vitalsData,
    updateField: updateVitals,
    handleSubmit: handleVitalsSubmit
  } = useVitalsForm({
    appointmentId,
    onVitalsSaved: onSave
  })

  // Prescription Hook
  const {
    loading: rxLoading,
    instructions: rxInstructions,
    setInstructions: setRxInstructions,
    medications,
    addMedication,
    removeMedication,
    updateMedication,
    handleSubmit: handleRxSubmit
  } = usePrescriptionForm({
    appointmentId,
    patientId,
    doctorId,
    onPrescriptionSaved: onSave
  })

  // Invoice Hook
  const {
    loading: invLoading,
    status: invStatus,
    setStatus: setInvStatus,
    items: invItems,
    addItem: addInvItem,
    removeItem: removeInvItem,
    updateItem: updateInvItem,
    calculateTotal: calculateInvTotal,
    handleSubmit: handleInvSubmit
  } = useInvoiceForm({
    appointmentId,
    patientId,
    onInvoiceCreated: onSave
  })

  return (
    <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="flex-1 flex flex-col h-full">
      <div className="border-b border-border px-6 bg-muted/5">
        <TabsList className="h-12 w-full justify-start bg-transparent p-0 gap-6">
          <TabsTrigger 
            value="observations" 
            className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0 pb-0"
          >
            <div className="flex items-center gap-2 py-2">
              <FileText className="h-4 w-4" />
              <span>Observations</span>
            </div>
          </TabsTrigger>
          <TabsTrigger 
            value="vitals" 
            className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0 pb-0"
          >
            <div className="flex items-center gap-2 py-2">
              <Activity className="h-4 w-4" />
              <span>Vitals</span>
            </div>
          </TabsTrigger>
          <TabsTrigger 
            value="prescription" 
            className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0 pb-0"
          >
            <div className="flex items-center gap-2 py-2">
              <Pill className="h-4 w-4" />
              <span>Prescription</span>
            </div>
          </TabsTrigger>
          <TabsTrigger 
            value="invoice" 
            className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0 pb-0"
          >
            <div className="flex items-center gap-2 py-2">
              <Receipt className="h-4 w-4" />
              <span>Invoice</span>
            </div>
          </TabsTrigger>
        </TabsList>
      </div>

      <div className="p-6 flex-1 overflow-y-auto min-h-[400px]">
        {/* Observations Tab */}
        <TabsContent value="observations" className="mt-0 h-full space-y-4">
          <form onSubmit={handleSaveObservations} className="h-full flex flex-col">
            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-4 p-4 bg-muted/20 rounded-lg border border-border/50">
                <div className="flex-1">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1.5 block">
                    Clinical Template
                  </Label>
                  <Select value={selectedTemplateId} onValueChange={handleTemplateChange}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Select a speciality template..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None (Standard)</SelectItem>
                      {templates.map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedTemplateId && selectedTemplateId !== "none" && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground pt-6">
                    <span className="bg-primary/10 text-primary px-2 py-1 rounded text-xs font-medium">
                      {templates.find(t => t.id === selectedTemplateId)?.speciality}
                    </span>
                  </div>
                )}
              </div>

              {/* Dynamic Fields Area */}
              {selectedTemplateId && selectedTemplateId !== "none" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg bg-muted/10 animate-in fade-in slide-in-from-top-2 duration-300">
                  {templates.find(t => t.id === selectedTemplateId)?.fields.map((field: any) => (
                    <div key={field.id} className="space-y-2">
                      <Label>{field.label}</Label>
                      {field.type === "text" && (
                        <Input 
                          value={dynamicFields[field.label] || ""} 
                          onChange={(e) => handleDynamicFieldChange(field.label, e.target.value)}
                          placeholder={`Enter ${field.label.toLowerCase()}`}
                        />
                      )}
                      {field.type === "number" && (
                        <Input 
                          type="number"
                          value={dynamicFields[field.label] || ""} 
                          onChange={(e) => handleDynamicFieldChange(field.label, e.target.value)}
                          placeholder="0"
                        />
                      )}
                      {field.type === "select" && (
                        <Select 
                          value={dynamicFields[field.label] || ""} 
                          onValueChange={(val) => handleDynamicFieldChange(field.label, val)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                          <SelectContent>
                            {field.options?.split(',').map((opt: string) => (
                              <SelectItem key={opt.trim()} value={opt.trim()}>{opt.trim()}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      {field.type === "checkbox" && (
                        <div className="flex items-center space-x-2 h-10">
                          <Checkbox 
                            id={field.id}
                            checked={dynamicFields[field.label] === "Yes"}
                            onCheckedChange={(checked: boolean) => handleDynamicFieldChange(field.label, checked ? "Yes" : "No")}
                          />
                          <label
                            htmlFor={field.id}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {field.label}
                          </label>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2 h-full">
                <Label htmlFor="observations" className="text-base font-medium">Clinical Notes & Findings</Label>
                <Textarea
                  id="observations"
                  placeholder="Enter clinical observations, examination findings, diagnosis notes..."
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  className="min-h-[200px] font-mono text-sm resize-none p-4"
                />
              </div>
            </div>
            <div className="flex justify-end pt-4 mt-auto">
              <Button type="submit" disabled={obsLoading} className="gap-2">
                {obsLoading ? "Saving..." : <><Save className="h-4 w-4" /> Save Observations</>}
              </Button>
            </div>
          </form>
        </TabsContent>

        {/* Vitals Tab */}
        <TabsContent value="vitals" className="mt-0 h-full space-y-4">
          <form onSubmit={(e) => { e.preventDefault(); handleVitalsSubmit(e); }} className="h-full flex flex-col">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4 p-4 border rounded-lg bg-muted/10">
                <h3 className="font-medium flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" /> Physical Stats
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="height">Height (cm)</Label>
                    <Input
                      id="height"
                      type="number"
                      step="0.1"
                      placeholder="170"
                      value={vitalsData.height}
                      onChange={(e) => updateVitals("height", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="weight">Weight (kg)</Label>
                    <Input
                      id="weight"
                      type="number"
                      step="0.1"
                      placeholder="70"
                      value={vitalsData.weight}
                      onChange={(e) => updateVitals("weight", e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4 p-4 border rounded-lg bg-muted/10">
                <h3 className="font-medium flex items-center gap-2">
                  <Activity className="h-4 w-4 text-red-500" /> Vital Signs
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bp">Blood Pressure</Label>
                    <Input
                      id="bp"
                      placeholder="120/80"
                      value={vitalsData.bloodPressure}
                      onChange={(e) => updateVitals("bloodPressure", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pulse">Pulse (bpm)</Label>
                    <Input
                      id="pulse"
                      type="number"
                      placeholder="72"
                      value={vitalsData.pulse}
                      onChange={(e) => updateVitals("pulse", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="temp">Temp (°F)</Label>
                    <Input
                      id="temp"
                      type="number"
                      step="0.1"
                      placeholder="98.6"
                      value={vitalsData.temperature}
                      onChange={(e) => updateVitals("temperature", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="spo2">SpO2 (%)</Label>
                    <Input
                      id="spo2"
                      type="number"
                      step="0.1"
                      placeholder="98"
                      value={vitalsData.spo2}
                      onChange={(e) => updateVitals("spo2", e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end pt-6 mt-auto">
              <Button type="submit" disabled={vitalsLoading} className="gap-2">
                {vitalsLoading ? "Saving..." : <><Save className="h-4 w-4" /> Save Vitals</>}
              </Button>
            </div>
          </form>
        </TabsContent>

        {/* Prescription Tab */}
        <TabsContent value="prescription" className="mt-0 h-full space-y-4">
          <form onSubmit={(e) => { e.preventDefault(); handleRxSubmit(e); }} className="h-full flex flex-col">
            <div className="flex-1 space-y-6">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">Medications</Label>
                <Button type="button" variant="outline" size="sm" onClick={addMedication} className="gap-2">
                  <Plus className="h-4 w-4" /> Add Medication
                </Button>
              </div>

              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                {medications.map((med, index) => (
                  <div key={index} className="p-4 border rounded-lg bg-card space-y-4 relative group">
                    <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeMedication(index)}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Medicine Name</Label>
                        <MedicineAutocomplete
                          value={med.name}
                          onChange={(val) => updateMedication(index, "name", val)}
                          placeholder="Search medicine..."
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-2">
                          <Label>Dosage</Label>
                          <Input
                            placeholder="500mg"
                            value={med.dosage}
                            onChange={(e) => updateMedication(index, "dosage", e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Freq</Label>
                          <Input
                            placeholder="2x daily"
                            value={med.frequency}
                            onChange={(e) => updateMedication(index, "frequency", e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Duration</Label>
                          <Input
                            placeholder="7 days"
                            value={med.duration}
                            onChange={(e) => updateMedication(index, "duration", e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {medications.length === 0 && (
                  <div className="text-center py-8 border-2 border-dashed rounded-lg text-muted-foreground">
                    No medications added. Click &quot;Add Medication&quot; to start.
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="rx-instructions">Instructions</Label>
                <Textarea
                  id="rx-instructions"
                  placeholder="Special instructions (e.g., take after food)..."
                  value={rxInstructions}
                  onChange={(e) => setRxInstructions(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <div className="flex justify-end pt-4 mt-auto">
              <Button type="submit" disabled={rxLoading} className="gap-2">
                {rxLoading ? "Saving..." : <><Save className="h-4 w-4" /> Save Prescription</>}
              </Button>
            </div>
          </form>
        </TabsContent>

        {/* Invoice Tab */}
        <TabsContent value="invoice" className="mt-0 h-full space-y-4">
          <form onSubmit={(e) => { e.preventDefault(); handleInvSubmit(e); }} className="h-full flex flex-col">
            <div className="flex-1 space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-base font-medium">Invoice Items</Label>
                  <p className="text-sm text-muted-foreground">Add services and costs</p>
                </div>
                <div className="flex items-center gap-4">
                  <Select value={invStatus} onValueChange={setInvStatus}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="outline" size="sm" onClick={addInvItem} className="gap-2">
                    <Plus className="h-4 w-4" /> Add Item
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                {invItems.map((item, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 border rounded-lg bg-card group">
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-3">
                      <div className="md:col-span-6 space-y-1">
                        <Label className="text-xs text-muted-foreground">Description</Label>
                        <Input
                          placeholder="Service description"
                          value={item.description}
                          onChange={(e) => updateInvItem(index, "description", e.target.value)}
                        />
                      </div>
                      <div className="md:col-span-2 space-y-1">
                        <Label className="text-xs text-muted-foreground">Qty</Label>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateInvItem(index, "quantity", parseInt(e.target.value))}
                        />
                      </div>
                      <div className="md:col-span-3 space-y-1">
                        <Label className="text-xs text-muted-foreground">Price (₹)</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.price}
                          onChange={(e) => updateInvItem(index, "price", parseFloat(e.target.value))}
                        />
                      </div>
                      <div className="md:col-span-1 flex items-end justify-end pb-1">
                         <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeInvItem(index)}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-end gap-4 p-4 bg-muted/10 rounded-lg">
                <span className="text-lg font-medium">Total Amount:</span>
                <span className="text-2xl font-bold text-primary">₹{calculateInvTotal().toFixed(2)}</span>
              </div>
            </div>
            <div className="flex justify-end pt-4 mt-auto">
              <Button type="submit" disabled={invLoading} className="gap-2">
                {invLoading ? "Creating..." : <><CheckCircle2 className="h-4 w-4" /> Create Invoice</>}
              </Button>
            </div>
          </form>
        </TabsContent>
      </div>
    </Tabs>
  )
}
