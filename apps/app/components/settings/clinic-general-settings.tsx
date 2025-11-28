"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Textarea } from "@workspace/ui/components/textarea"
import { apiHooks } from "@/lib/api-hooks"
import { Save, Building2, Clock } from "lucide-react"
import { toast } from "sonner"

export function ClinicGeneralSettings() {
  const { data: clinicData, isLoading: loading } = apiHooks.useClinicSettings()
  const updateSettings = apiHooks.useUpdateClinicSettings()
  
  const [clinic, setClinic] = useState({
    name: "",
    address: "",
    phoneNumber: "",
    email: "",
    website: "",
    description: "",
    openingTime: "09:00",
    closingTime: "18:00",
    workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    consultationDuration: 30,
  })

  useEffect(() => {
    if (clinicData) {
      console.log('Loaded clinic settings:', clinicData)
      console.log('Merging with defaults:', { ...clinic, ...clinicData })
      setClinic(prev => ({ ...prev, ...clinicData }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinicData])

  const handleSave = async () => {
    try {
      await updateSettings.mutateAsync(clinic)
      toast.success("Clinic settings have been updated successfully.")
    } catch (error) {
      console.error('Failed to save clinic settings:', error)
      toast.error("Failed to save clinic settings. Please try again.")
    }
  }

  const toggleWorkingDay = (day: string) => {
    setClinic(prev => ({
      ...prev,
      workingDays: prev.workingDays.includes(day)
        ? prev.workingDays.filter(d => d !== day)
        : [...prev.workingDays, day]
    }))
  }

  const weekDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

  if (loading) {
    return <div className="text-center py-8">Loading clinic settings...</div>
  }

  return (
    <div className="space-y-6">
      {/* Clinic Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <CardTitle>Clinic Information</CardTitle>
          </div>
          <CardDescription>Basic information about your clinic</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Clinic Name *</Label>
              <Input
                id="name"
                value={clinic.name}
                onChange={(e) => setClinic({ ...clinic, name: e.target.value })}
                placeholder="Enter clinic name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Phone Number *</Label>
              <Input
                id="phoneNumber"
                value={clinic.phoneNumber}
                onChange={(e) => setClinic({ ...clinic, phoneNumber: e.target.value })}
                placeholder="+91 1234567890"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={clinic.email}
                onChange={(e) => setClinic({ ...clinic, email: e.target.value })}
                placeholder="clinic@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                value={clinic.website}
                onChange={(e) => setClinic({ ...clinic, website: e.target.value })}
                placeholder="https://example.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              value={clinic.address}
              onChange={(e) => setClinic({ ...clinic, address: e.target.value })}
              placeholder="Enter clinic address"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={clinic.description}
              onChange={(e) => setClinic({ ...clinic, description: e.target.value })}
              placeholder="Brief description about your clinic"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Working Hours */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            <CardTitle>Working Hours</CardTitle>
          </div>
          <CardDescription>Set your clinic&apos;s operating hours</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="openingTime">Opening Time</Label>
              <Input
                id="openingTime"
                type="time"
                value={clinic.openingTime}
                onChange={(e) => setClinic({ ...clinic, openingTime: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="closingTime">Closing Time</Label>
              <Input
                id="closingTime"
                type="time"
                value={clinic.closingTime}
                onChange={(e) => setClinic({ ...clinic, closingTime: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="consultationDuration">Consultation Duration (mins)</Label>
              <Input
                id="consultationDuration"
                type="number"
                min="15"
                step="15"
                value={clinic.consultationDuration}
                onChange={(e) => setClinic({ ...clinic, consultationDuration: parseInt(e.target.value) })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Working Days</Label>
            <div className="flex flex-wrap gap-2">
              {weekDays.map(day => (
                <Button
                  key={day}
                  type="button"
                  variant={clinic.workingDays.includes(day) ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleWorkingDay(day)}
                >
                  {day.slice(0, 3)}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={updateSettings.isPending} className="gap-2">
          <Save className="h-4 w-4" />
          {updateSettings.isPending ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  )
}
