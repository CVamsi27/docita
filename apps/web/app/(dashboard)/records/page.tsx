"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { FileText, Search, Filter } from "lucide-react"
import { Input } from "@workspace/ui/components/input"
import { Button } from "@workspace/ui/components/button"

export default function RecordsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Records</h1>
        <p className="text-muted-foreground">
          Manage digital documents, prescriptions, and reports.
        </p>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search records..."
            className="pl-9 bg-white dark:bg-neutral-900"
          />
        </div>
        <Button variant="outline" className="gap-2">
          <Filter className="h-4 w-4" />
          Filter
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="border-dashed">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 text-primary mb-4">
              <FileText className="h-6 w-6" />
            </div>
            <CardTitle>No records found</CardTitle>
            <CardDescription>
              Upload documents or generate prescriptions to see them here.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full">Upload Document</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
