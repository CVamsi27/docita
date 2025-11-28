"use client"

import { useState } from "react"
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
import { Plus, Eye, EyeOff } from "lucide-react"
import { API_URL } from "@/lib/api"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select"

export function CreateClinicDialog({ onClinicCreated }: { onClinicCreated: () => void }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    tier: "FREE",
    adminName: "",
    adminEmail: "",
    adminPassword: "",
  })

  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const token = localStorage.getItem("docita_token")
      const res = await fetch(`${API_URL}/super-admin/clinics`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      })

      if (res.ok) {
        setOpen(false)
        onClinicCreated()
        setFormData({
          name: "",
          email: "",
          phone: "",
          address: "",
          tier: "FREE",
          adminName: "",
          adminEmail: "",
          adminPassword: "",
        })
      } else {
        alert("Failed to create clinic")
      }
    } catch (error) {
      console.error(error)
      alert("Error creating clinic")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Clinic
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Clinic</DialogTitle>
          <DialogDescription>
            Create a new clinic and its admin account.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">Name</Label>
              <Input id="name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="col-span-3" required />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">Email</Label>
              <Input id="email" type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="col-span-3" required />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="phone" className="text-right">Phone</Label>
              <Input id="phone" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="col-span-3" required />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="address" className="text-right">Address</Label>
              <Input id="address" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="col-span-3" required />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="tier" className="text-right">Tier</Label>
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
            <div className="border-t pt-4 mt-2">
              <h4 className="mb-4 text-sm font-medium">Admin Details</h4>
              <div className="grid gap-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="adminName" className="text-right">Name</Label>
                  <Input id="adminName" value={formData.adminName} onChange={e => setFormData({...formData, adminName: e.target.value})} className="col-span-3" required />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="adminEmail" className="text-right">Email</Label>
                  <Input id="adminEmail" type="email" value={formData.adminEmail} onChange={e => setFormData({...formData, adminEmail: e.target.value})} className="col-span-3" required />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="adminPassword" className="text-right">Password</Label>
                  <div className="col-span-3 relative">
                    <Input 
                      id="adminPassword" 
                      type={showPassword ? "text" : "password"} 
                      value={formData.adminPassword} 
                      onChange={e => setFormData({...formData, adminPassword: e.target.value})} 
                      required 
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Clinic"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
