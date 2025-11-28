"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Button } from "@workspace/ui/components/button"
import { API_URL } from "@/lib/api"
import { CreateClinicDialog } from "./create-clinic-dialog"
import { ClinicList } from "./clinic-list"

export default function SuperAdminDashboard() {
  const [clinics, setClinics] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    clinics: 0,
    users: 0,
    patients: 0,
    invoices: 0,
    prescriptions: 0,
  })

  const loadData = async () => {
    try {
      const token = localStorage.getItem("docita_token")
      const headers = { Authorization: `Bearer ${token}` }
      
      const [clinicsRes, statsRes] = await Promise.all([
        fetch(`${API_URL}/super-admin/clinics`, { headers }),
        fetch(`${API_URL}/super-admin/stats`, { headers })
      ])

      if (clinicsRes.ok) setClinics(await clinicsRes.json())
      if (statsRes.ok) setStats(await statsRes.json())
    } catch (error) {
      console.error("Failed to load data", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleLogout = () => {
    localStorage.removeItem("docita_token")
    localStorage.removeItem("docita_user")
    window.location.href = "/"
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Super Admin Dashboard</h1>
        <div className="flex items-center gap-4">
          <CreateClinicDialog onClinicCreated={loadData} />
          <Button variant="outline" onClick={handleLogout}>Logout</Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clinics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.clinics}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Doctors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.users}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Patients</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.patients}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.invoices}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prescriptions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.prescriptions}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Clinics</CardTitle>
        </CardHeader>
        <CardContent>
          <ClinicList clinics={clinics} loading={loading} onUpdate={loadData} />
        </CardContent>
      </Card>
    </div>
  )
}
