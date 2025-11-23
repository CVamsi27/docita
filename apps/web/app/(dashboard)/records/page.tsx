"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { FileText, Search, Pill, Eye, Calendar, Receipt, Download, Edit, DollarSign } from "lucide-react"
import { Input } from "@workspace/ui/components/input"
import { Button } from "@workspace/ui/components/button"
import { Badge } from "@workspace/ui/components/badge"
import { API_URL } from "@/lib/api"
import { useRouter } from "next/navigation"
import { format } from "date-fns"

export default function RecordsPage() {
  const router = useRouter()
  const [prescriptions, setPrescriptions] = useState<any[]>([])
  const [invoices, setInvoices] = useState<any[]>([])
  const [documents, setDocuments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    loadRecords()
  }, [])

  const loadRecords = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem("docita_token")
      
      // Load prescriptions
      const prescriptionsRes = await fetch(`${API_URL}/prescriptions`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (prescriptionsRes.ok) {
        const prescriptionsData = await prescriptionsRes.json()
        setPrescriptions(prescriptionsData)
      }

      // Load invoices
      const invoicesRes = await fetch(`${API_URL}/invoices`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (invoicesRes.ok) {
        const invoicesData = await invoicesRes.json()
        setInvoices(invoicesData)
      }

      // Load documents
      const documentsRes = await fetch(`${API_URL}/documents`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (documentsRes.ok) {
        const documentsData = await documentsRes.json()
        setDocuments(documentsData)
      }
    } catch (error) {
      console.error("Failed to load records:", error)
    } finally {
      setLoading(false)
    }
  }

  const filteredPrescriptions = prescriptions.filter(rx => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    const patientName = rx.patient 
      ? `${rx.patient.firstName} ${rx.patient.lastName}`.toLowerCase()
      : ""
    return patientName.includes(query)
  })

  const filteredInvoices = invoices.filter(inv => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    const patientName = inv.patient 
      ? `${inv.patient.firstName} ${inv.patient.lastName}`.toLowerCase()
      : ""
    return patientName.includes(query) || inv.status?.toLowerCase().includes(query)
  })

  const filteredDocuments = documents.filter(doc => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return doc.name?.toLowerCase().includes(query) || doc.type?.toLowerCase().includes(query)
  })

  const formatDate = (dateString: any) => {
    if (!dateString) return "N/A"
    try {
      return format(new Date(dateString), "MMM d, yyyy")
    } catch {
      return "N/A"
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Records</h1>
        <p className="text-muted-foreground">
          Manage prescriptions, invoices, and documents.
        </p>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search records..."
            className="pl-9 bg-background"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        {searchQuery && (
          <Button variant="ghost" size="sm" onClick={() => setSearchQuery("")}>
            Clear
          </Button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">
          Loading records...
        </div>
      ) : (
        <div className="space-y-8">
          {/* Prescriptions Section */}
          <div>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Pill className="h-5 w-5 text-primary" />
              Prescriptions ({filteredPrescriptions.length})
            </h2>
            {filteredPrescriptions.length === 0 ? (
              <Card className="border-dashed">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 text-primary mb-4">
                    <Pill className="h-6 w-6" />
                  </div>
                  <CardTitle>No prescriptions found</CardTitle>
                  <CardDescription>
                    {searchQuery 
                      ? `No prescriptions match "${searchQuery}"`
                      : "Prescriptions will appear here after consultations."}
                  </CardDescription>
                </CardHeader>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredPrescriptions.map((rx) => (
                  <Card key={rx.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Pill className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-base">
                              {rx.patient ? `${rx.patient.firstName} ${rx.patient.lastName}` : "Patient"}
                            </CardTitle>
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(rx.createdAt)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">
                          {rx.medications?.length || 0} medication(s)
                        </p>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="flex-1 gap-1" onClick={() => router.push(`/prescriptions/${rx.id}`)}>
                            <Eye className="h-3 w-3" />
                            View
                          </Button>
                          <Button size="sm" variant="outline" className="flex-1 gap-1" onClick={() => {
                            if (rx.appointmentId) {
                              router.push(`/consultation/${rx.appointmentId}?tab=prescription`)
                            }
                          }}>
                            <Edit className="h-3 w-3" />
                            Edit
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Invoices Section */}
          <div>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" />
              Invoices ({filteredInvoices.length})
            </h2>
            {filteredInvoices.length === 0 ? (
              <Card className="border-dashed">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 text-primary mb-4">
                    <Receipt className="h-6 w-6" />
                  </div>
                  <CardTitle>No invoices found</CardTitle>
                  <CardDescription>
                    {searchQuery 
                      ? `No invoices match "${searchQuery}"`
                      : "Invoices will appear here after consultations."}
                  </CardDescription>
                </CardHeader>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredInvoices.map((inv) => (
                  <Card key={inv.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Receipt className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-base">
                              {inv.patient ? `${inv.patient.firstName} ${inv.patient.lastName}` : "Patient"}
                            </CardTitle>
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(inv.createdAt)}
                            </p>
                          </div>
                        </div>
                        <Badge variant={inv.status === 'paid' ? 'default' : inv.status === 'pending' ? 'secondary' : 'destructive'}>
                          {inv.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <p className="text-sm font-semibold flex items-center gap-1">
                          <DollarSign className="h-4 w-4" />
                          ₹{inv.totalAmount || 0}
                        </p>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="flex-1 gap-1" onClick={() => router.push(`/invoices/${inv.id}`)}>
                            <Eye className="h-3 w-3" />
                            View
                          </Button>
                          <Button size="sm" variant="outline" className="flex-1 gap-1" onClick={() => {
                            // Implement download functionality
                            window.print()
                          }}>
                            <Download className="h-3 w-3" />
                            Download
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Documents Section */}
          <div>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Documents ({filteredDocuments.length})
            </h2>
            {filteredDocuments.length === 0 ? (
              <Card className="border-dashed">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 text-primary mb-4">
                    <FileText className="h-6 w-6" />
                  </div>
                  <CardTitle>No documents found</CardTitle>
                  <CardDescription>
                    {searchQuery 
                      ? `No documents match "${searchQuery}"`
                      : "Upload documents to see them here."}
                  </CardDescription>
                </CardHeader>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredDocuments.map((doc) => (
                  <Card key={doc.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <FileText className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-base">{doc.name || "Document"}</CardTitle>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatDate(doc.uploadedAt || doc.createdAt)}
                            </p>
                          </div>
                        </div>
                        <Badge variant="secondary">{doc.type || "File"}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="flex-1 gap-1" onClick={() => window.open(doc.url, '_blank')}>
                          <Eye className="h-3 w-3" />
                          View
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1 gap-1" onClick={() => {
                          const link = document.createElement('a')
                          link.href = doc.url
                          link.download = doc.name || 'document'
                          link.click()
                        }}>
                          <Download className="h-3 w-3" />
                          Download
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
