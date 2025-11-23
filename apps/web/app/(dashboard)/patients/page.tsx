"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { patientsAPI } from "@/lib/api"
import { Patient } from "@workspace/types"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { Search, MoreHorizontal } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar"
import { format } from "date-fns"

import { AddPatientDialog } from "@/components/patients/add-patient-dialog"

import { useSearchParams, useRouter } from "next/navigation"

import { Suspense } from "react"

function PatientsContent() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const searchParams = useSearchParams()
  const router = useRouter()
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)

  const loadPatients = useCallback(async () => {
    try {
      setLoading(true)
      const data = await patientsAPI.getAll()
      setPatients(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load patients")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadPatients()
    if (searchParams.get("action") === "new") {
      setIsAddDialogOpen(true)
    }
  }, [searchParams, loadPatients])

  const handleDialogChange = useCallback((open: boolean) => {
    setIsAddDialogOpen(open)
    if (!open) {
      // Remove the query param when dialog closes
      const newParams = new URLSearchParams(searchParams.toString())
      newParams.delete("action")
      router.replace(`/patients?${newParams.toString()}`)
    }
  }, [searchParams, router])

  // Filter patients based on search query
  const filteredPatients = useMemo(() => {
    if (!searchQuery.trim()) {
      return patients
    }

    const query = searchQuery.toLowerCase().trim()
    return patients.filter((patient) => {
      const fullName = `${patient.firstName} ${patient.lastName}`.toLowerCase()
      const phoneNumber = patient.phoneNumber.toLowerCase()
      
      return fullName.includes(query) || phoneNumber.includes(query)
    })
  }, [patients, searchQuery])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Patients</h1>
          <p className="text-muted-foreground">
            Manage your patient records and history.
          </p>
        </div>
        <AddPatientDialog 
          open={isAddDialogOpen} 
          onOpenChange={handleDialogChange}
          onPatientAdded={loadPatients} 
        />
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or phone..."
            className="pl-9 bg-background"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        {searchQuery && (
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setSearchQuery("")}
          >
            Clear
          </Button>
        )}
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-4 border border-destructive/20">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <div className="rounded-md border border-border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-muted/50">
              <TableHead className="w-[50px]"></TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Main Symptom</TableHead>
              <TableHead>Gender</TableHead>
              <TableHead>Last Updated</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  Loading patients...
                </TableCell>
              </TableRow>
            ) : filteredPatients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  {searchQuery ? `No patients found matching "${searchQuery}"` : "No patients found."}
                </TableCell>
              </TableRow>
            ) : (
              filteredPatients.map((patient) => (
                <TableRow 
                  key={patient.id} 
                  className="hover:bg-muted/50 cursor-pointer"
                  onClick={() => window.location.href = `/patients/${patient.id}`}
                >
                  <TableCell>
                    <Avatar className="h-8 w-8 bg-primary/10 text-primary">
                      <AvatarFallback className="bg-primary/10 text-primary">{patient.firstName.charAt(0)}{patient.lastName.charAt(0)}</AvatarFallback>
                    </Avatar>
                  </TableCell>
                  <TableCell className="font-medium">{patient.firstName} {patient.lastName}</TableCell>
                  <TableCell>
                    <div className="flex flex-col text-sm">
                      <span>{patient.phoneNumber}</span>
                      <span className="text-muted-foreground">{patient.email}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground italic">
                      {patient.medicalHistory && patient.medicalHistory.length > 0 
                        ? patient.medicalHistory[0] 
                        : patient.allergies || '-'}
                    </span>
                  </TableCell>
                  <TableCell className="capitalize">{patient.gender}</TableCell>
                  <TableCell>
                    {patient.updatedAt ? format(new Date(patient.updatedAt), 'MMM d, yyyy') : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          className="h-8 w-8 p-0 hover:bg-muted"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation()
                          window.location.href = `/patients/${patient.id}`
                        }}>View details</DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => e.stopPropagation()}>Edit patient</DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-destructive focus:text-destructive"
                          onClick={(e) => e.stopPropagation()}
                        >Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

export default function PatientsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PatientsContent />
    </Suspense>
  )
}
