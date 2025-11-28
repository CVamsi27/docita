'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { usePermissionStore } from "@/lib/stores/permission-store"

interface Clinic {
  id: string
  name: string
  address?: string
  phone?: string
  email?: string
  logo?: string
  tier?: "FREE" | "STARTER" | "PROFESSIONAL" | "ENTERPRISE"
}

interface ClinicContextType {
  clinicId: string | null
  clinic: Clinic | null
  setClinic: (clinic: Clinic) => void
  userClinics: Clinic[]
  setUserClinics: (clinics: Clinic[]) => void
}

const ClinicContext = createContext<ClinicContextType | undefined>(undefined)

export function ClinicProvider({ children }: { children: React.ReactNode }) {
  const [clinicId, setClinicId] = useState<string | null>(null)
  const [clinic, setClinicState] = useState<Clinic | null>(null)
  const [userClinics, setUserClinics] = useState<Clinic[]>([])
  const { setTier } = usePermissionStore()

  // Load selected clinic from localStorage or fetch from API on mount
  useEffect(() => {
    const fetchClinic = async () => {
      try {
        // Try to get from localStorage first for immediate render
        const savedClinicId = localStorage.getItem('selectedClinicId')
        const savedClinic = localStorage.getItem('selectedClinic')
        
        if (savedClinicId && savedClinic) {
          const parsedClinic = JSON.parse(savedClinic)
          setClinicId(savedClinicId)
          setClinicState(parsedClinic)
          if (parsedClinic.tier) {
            setTier(parsedClinic.tier)
          }
        }

        // Always fetch fresh data from API if we have an ID or token
        // TODO: Replace with actual API call once endpoint is ready
        // const response = await api.get('/clinics/current')
        // if (response.data) {
        //   setClinic(response.data)
        // }
      } catch (error) {
        console.error("Failed to load clinic", error)
      }
    }

    fetchClinic()
  }, [setTier])

  const setClinic = (newClinic: Clinic) => {
    setClinicId(newClinic.id)
    setClinicState(newClinic)
    if (newClinic.tier) {
      setTier(newClinic.tier)
    }
    localStorage.setItem('selectedClinicId', newClinic.id)
    localStorage.setItem('selectedClinic', JSON.stringify(newClinic))
  }

  return (
    <ClinicContext.Provider
      value={{
        clinicId,
        clinic,
        setClinic,
        userClinics,
        setUserClinics,
      }}
    >
      {children}
    </ClinicContext.Provider>
  )
}

export function useClinic() {
  const context = useContext(ClinicContext)
  if (context === undefined) {
    throw new Error('useClinic must be used within a ClinicProvider')
  }
  return context
}
