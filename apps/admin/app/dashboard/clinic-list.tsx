"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/table"
import { Badge } from "@workspace/ui/components/badge"
import { EditClinicDialog } from "./edit-clinic-dialog"

interface Clinic {
  id: string
  name: string
  email: string
  phone: string
  address: string
  tier: string
  active: boolean
  _count?: {
    users: number
    patients: number
  }
}

export function ClinicList({ clinics, loading, onUpdate }: { clinics: Clinic[], loading: boolean, onUpdate: () => void }) {

  if (loading) return <div>Loading...</div>

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Tier</TableHead>
          <TableHead>Users</TableHead>
          <TableHead>Patients</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {clinics.map((clinic) => (
          <TableRow key={clinic.id}>
            <TableCell className="font-medium">{clinic.name}</TableCell>
            <TableCell>{clinic.email}</TableCell>
            <TableCell>
              <Badge variant="outline">{clinic.tier}</Badge>
            </TableCell>
            <TableCell>{clinic._count?.users || 0}</TableCell>
            <TableCell>{clinic._count?.patients || 0}</TableCell>
            <TableCell>
              <Badge variant={clinic.active ? "default" : "secondary"}>
                {clinic.active ? "Active" : "Inactive"}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              <EditClinicDialog clinic={clinic} onClinicUpdated={onUpdate} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
