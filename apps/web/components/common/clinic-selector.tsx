'use client'

import { useEffect } from 'react'
import { useClinic } from '@/lib/clinic-context'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import { Building2 } from 'lucide-react'

export function ClinicSelector() {
  const { clinic, userClinics, setClinic, setUserClinics } = useClinic()

  useEffect(() => {
    // Fetch user's clinics on mount
    const fetchClinics = async () => {
      try {
        // For now, just use the default clinic
        // In a real implementation, you would fetch from the API
        const defaultClinic = {
          id: 'default-clinic-id',
          name: 'Docita Health Clinic',
        }
        setUserClinics([defaultClinic])
      } catch (error) {
        console.error('Failed to fetch clinics:', error)
      }
    }

    fetchClinics()
  }, [setUserClinics])

  // If user has only one clinic, don't show the selector
  if (userClinics.length <= 1) {
    return null
  }

  return (
    <div className="flex items-center gap-2">
      <Building2 className="h-4 w-4 text-muted-foreground" />
      <Select
        value={clinic?.id}
        onValueChange={(value) => {
          const selectedClinic = userClinics.find((c) => c.id === value)
          if (selectedClinic) {
            setClinic(selectedClinic)
          }
        }}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Select clinic" />
        </SelectTrigger>
        <SelectContent>
          {userClinics.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
