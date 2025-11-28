"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
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
import { 
  Search,
  Eye,
  Calendar,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from "lucide-react"
import Link from "next/link"
import { apiHooks } from "@/lib/api-hooks"

interface Prescription {
  id: string
  patient: { name: string }
  createdAt: string
  diagnosis: string
}

export default function PrescriptionsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const { data: prescriptions = [], isLoading: loading } = apiHooks.usePrescriptions()
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null)

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc'
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key, direction })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sortItems = <T extends any>(items: T[], keyMap: Record<string, string>) => {
    if (!sortConfig) return items
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return [...items].sort((a: any, b: any) => {
      const key = keyMap[sortConfig.key] || sortConfig.key
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const getValue = (obj: any, path: string) => {
        return path.split('.').reduce((o, i) => o?.[i], obj)
      }

      const aValue = getValue(a, key)
      const bValue = getValue(b, key)

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })
  }

  const filterBySearch = (items: Prescription[]) => {
    if (!searchQuery) return items
    
    const query = searchQuery.toLowerCase()
    return items.filter(item => {
      const patientName = item.patient.name.toLowerCase()
      const date = new Date(item.createdAt).toLocaleDateString()
      return patientName.includes(query) || date.includes(query)
    })
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  const filteredPrescriptions = sortItems(filterBySearch(prescriptions), {
    'date': 'createdAt',
    'patient': 'patient.name',
    'diagnosis': 'diagnosis'
  })

  const SortIcon = ({ column }: { column: string }) => {
    if (sortConfig?.key !== column) {
      return <ArrowUpDown className="ml-2 h-4 w-4 text-muted-foreground/50" />
    }
    return sortConfig.direction === 'asc' ? 
      <ArrowUp className="ml-2 h-4 w-4" /> : 
      <ArrowDown className="ml-2 h-4 w-4" />
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-6 lg:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Prescriptions</h1>
          <p className="text-muted-foreground">
            View and manage all patient prescriptions
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by patient name or date..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Prescriptions</CardTitle>
          <CardDescription>A list of all prescriptions issued by the clinic.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleSort('date')}
                >
                  <div className="flex items-center">
                    Date
                    <SortIcon column="date" />
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleSort('patient')}
                >
                  <div className="flex items-center">
                    Patient
                    <SortIcon column="patient" />
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleSort('diagnosis')}
                >
                  <div className="flex items-center">
                    Diagnosis
                    <SortIcon column="diagnosis" />
                  </div>
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPrescriptions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    No prescriptions found
                  </TableCell>
                </TableRow>
              ) : (
                filteredPrescriptions.map((prescription) => (
                  <TableRow key={prescription.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {formatDate(prescription.createdAt)}
                      </div>
                    </TableCell>
                    <TableCell>{prescription.patient.name}</TableCell>
                    <TableCell>{prescription.diagnosis || "—"}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/prescriptions/${prescription.id}`}>
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
