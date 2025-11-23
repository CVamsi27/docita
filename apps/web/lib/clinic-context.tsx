'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

interface Clinic {
  id: string
  name: string
  address?: string
  phone?: string
  email?: string
  logo?: string
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

  // Load selected clinic from localStorage on mount
  useEffect(() => {
    const savedClinicId = localStorage.getItem('selectedClinicId')
    const savedClinic = localStorage.getItem('selectedClinic')
    
    if (savedClinicId && savedClinic) {
      setClinicId(savedClinicId)
      setClinicState(JSON.parse(savedClinic))
    } else {
      // Default to default clinic if nothing saved
      const defaultClinic = {
        id: 'default-clinic-id',
        name: 'Docita Health Clinic',
      }
      setClinicId(defaultClinic.id)
      setClinicState(defaultClinic)
    }
  }, [])

  const setClinic = (newClinic: Clinic) => {
    setClinicId(newClinic.id)
    setClinicState(newClinic)
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
