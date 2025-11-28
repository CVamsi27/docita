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
import { Pencil } from "lucide-react"
import { API_URL } from "@/lib/api"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select"

interface Clinic {
  id: string
  name: string
  email: string
  phone: string
  address: string
  tier: string
  active: boolean
}

export function EditClinicDialog({ clinic, onClinicUpdated }: { clinic: Clinic, onClinicUpdated: () => void }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    tier: "FREE",
    active: true,
  })

  useEffect(() => {
    if (clinic) {
      setFormData({
        name: clinic.name,
        email: clinic.email,
        phone: clinic.phone,
        address: clinic.address,
        tier: clinic.tier,
        active: clinic.active,
      })
    }
  }, [clinic])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const token = localStorage.getItem("docita_token")
      const res = await fetch(`${API_URL}/super-admin/clinics/${clinic.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      })

      if (res.ok) {
        setOpen(false)
        onClinicUpdated()
      } else {
        alert("Failed to update clinic")
      }
    } catch (error) {
      console.error(error)
      alert("Error updating clinic")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Clinic</DialogTitle>
          <DialogDescription>
            Update clinic details.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-name" className="text-right">Name</Label>
              <Input id="edit-name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="col-span-3" required />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-email" className="text-right">Email</Label>
              <Input id="edit-email" type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="col-span-3" required />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-phone" className="text-right">Phone</Label>
              <Input id="edit-phone" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="col-span-3" required />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-address" className="text-right">Address</Label>
              <Input id="edit-address" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="col-span-3" required />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-tier" className="text-right">Tier</Label>
              <Select value={formData.tier} onValueChange={val => setFormData({...formData, tier: val})}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select tier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FREE">Free</SelectItem>
                  <SelectItem value="STARTER">Starter</SelectItem>
                  <SelectItem value="PROFESSIONAL">Professional</SelectItem>
                  <SelectItem value="ENTERPRISE">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-active" className="text-right">Status</Label>
              <Select value={formData.active ? "active" : "inactive"} onValueChange={val => setFormData({...formData, active: val === "active"})}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? "Updating..." : "Update Clinic"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
