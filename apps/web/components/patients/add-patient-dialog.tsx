"use client"

import { useState, useEffect } from "react"

import { Plus } from "lucide-react"

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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form"
import { Label } from "@workspace/ui/components/label"
import { Input } from "@workspace/ui/components/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Textarea } from "@workspace/ui/components/textarea"
import { Checkbox } from "@workspace/ui/components/checkbox"
import { usePatientForm } from "@/hooks/use-patient-form"
import { API_URL } from "@/lib/api"

interface AddPatientDialogProps {
  onPatientAdded: () => void
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function AddPatientDialog({ onPatientAdded, open: controlledOpen, onOpenChange: controlledOnOpenChange }: AddPatientDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen
  const setOpen = isControlled ? controlledOnOpenChange : setInternalOpen

  const [customFields, setCustomFields] = useState<any[]>([])
  const [customData, setCustomData] = useState<Record<string, any>>({})

  useEffect(() => {
    if (open) {
      loadCustomFields()
    }
  }, [open])

  const loadCustomFields = async () => {
    try {
      const res = await fetch(`${API_URL}/custom-fields`)
      if (res.ok) {
        const data = await res.json()
        setCustomFields(data)
      }
    } catch (error) {
      console.error("Failed to load custom fields", error)
    }
  }

  const {
    form,
    loading,
    onSubmit,
  } = usePatientForm({ 
    onPatientAdded 
  })

  const handleSubmit = async (data: any) => {
    // Merge custom data with form data
    const finalData = { ...data, customData }
    await onSubmit(finalData, () => setOpen?.(false))
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add Patient
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add New Patient</DialogTitle>
          <DialogDescription>
            Enter the patient&apos;s personal information. We&apos;ll create a secure record.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="dateOfBirth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date of Birth</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gender</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="MALE">Male</SelectItem>
                        <SelectItem value="FEMALE">Female</SelectItem>
                        <SelectItem value="OTHER">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input placeholder="+1234567890" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="john@example.com" type="email" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Textarea placeholder="123 Main St, City, Country" {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Custom Fields Section */}
            {customFields.length > 0 && (
              <div className="space-y-4 pt-4 border-t">
                <h4 className="font-medium text-sm">Additional Information</h4>
                {customFields.map((field) => (
                  <div key={field.id} className="space-y-2">
                    <Label>{field.name} {field.required && <span className="text-destructive">*</span>}</Label>
                    {field.fieldType === "text" && (
                      <Input
                        value={customData[field.name] || ""}
                        onChange={(e) => setCustomData({ ...customData, [field.name]: e.target.value })}
                        required={field.required}
                      />
                    )}
                    {field.fieldType === "number" && (
                      <Input
                        type="number"
                        value={customData[field.name] || ""}
                        onChange={(e) => setCustomData({ ...customData, [field.name]: e.target.value })}
                        required={field.required}
                      />
                    )}
                    {field.fieldType === "select" && (
                      <Select
                        value={customData[field.name] || ""}
                        onValueChange={(val) => setCustomData({ ...customData, [field.name]: val })}
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
                    {field.fieldType === "date" && (
                      <Input
                        type="date"
                        value={customData[field.name] || ""}
                        onChange={(e) => setCustomData({ ...customData, [field.name]: e.target.value })}
                        required={field.required}
                      />
                    )}
                    {field.fieldType === "checkbox" && (
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={field.id}
                          checked={customData[field.name] === true}
                          onCheckedChange={(checked: boolean) => setCustomData({ ...customData, [field.name]: checked })}
                        />
                        <label htmlFor={field.id} className="text-sm">{field.name}</label>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <DialogFooter>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : "Save Patient"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
