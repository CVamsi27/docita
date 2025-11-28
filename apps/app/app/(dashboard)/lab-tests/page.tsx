"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import {
  Search,
  Plus,
  FlaskConical,
  Clock,
  CheckCircle,
  AlertCircle,
  Filter,
  FileText,
  RefreshCw,
} from "lucide-react";
import { apiHooks } from "@/lib/api-hooks";
import { EmptyState, LoadingState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";

export default function LabTestsPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const {
    data: labTests = [],
    isLoading,
    refetch,
  } = apiHooks.useLabTestOrders();
  const { data: stats } = apiHooks.useLabTestStats();

  const filteredTests = labTests.filter((test) => {
    const patientName = test.patient
      ? `${test.patient.firstName} ${test.patient.lastName}`.toLowerCase()
      : "";
    const testName = test.labTest?.name?.toLowerCase() || "";
    const doctorName = test.doctor?.name?.toLowerCase() || "";
    const search = searchQuery.toLowerCase();

    return (
      patientName.includes(search) ||
      testName.includes(search) ||
      doctorName.includes(search)
    );
  });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Lab Tests</h1>
          <p className="text-muted-foreground">
            Manage laboratory test orders and results
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Order Test
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pending ?? 0}</div>
            <p className="text-xs text-muted-foreground">Awaiting processing</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <FlaskConical className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">
              {stats?.inProgress ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Currently processing
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {stats?.completed ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">Results available</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Urgent</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              {stats?.urgent ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">High priority tests</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by patient, test, or doctor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" className="gap-2">
          <Filter className="h-4 w-4" />
          Filter
        </Button>
      </div>

      {/* Lab Tests Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lab Test Orders</CardTitle>
          <CardDescription>
            A list of all laboratory test orders
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <LoadingState message="Loading lab tests..." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      Patient
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      Test Name
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      Category
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      Ordered By
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      Order Date
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTests.map((test) => (
                    <tr
                      key={test.id}
                      className="border-b hover:bg-muted/50 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="font-medium">
                          {test.patient
                            ? `${test.patient.firstName} ${test.patient.lastName}`
                            : "Unknown"}
                        </div>
                      </td>
                      <td className="py-3 px-4">{test.labTest?.name || "-"}</td>
                      <td className="py-3 px-4 text-muted-foreground capitalize">
                        {test.labTest?.category || "-"}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {test.doctor?.name || "-"}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {formatDate(test.createdAt)}
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={test.status} />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button variant="ghost" size="sm" className="gap-1">
                          <FileText className="h-4 w-4" />
                          {test.status === "completed"
                            ? "View Results"
                            : "Details"}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!isLoading && filteredTests.length === 0 && (
            <EmptyState
              icon={FlaskConical}
              title="No lab tests found"
              description="Lab test orders will appear here"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
