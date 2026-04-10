"use client";

import Link from "next/link";
import { format } from "date-fns";
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  Loader2,
  Search,
  User,
} from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { Badge } from "@workspace/ui/components/badge";
import { useCodingQueue } from "@/hooks/api/use-medical-coding";
import { useState } from "react";
import { useDebounce } from "@workspace/hooks/use-debounce";
import {
  Feature,
  FeatureGate,
} from "@/features/_shared/components/auth/feature-gate";
import { EmptyState } from "@workspace/ui/components/empty-state";
import { showUserFacingErrorToast } from "@/lib/user-facing-errors";

export default function CodingQueuePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);

  const {
    data: visits = [],
    isLoading,
    error,
  } = useCodingQueue(debouncedSearch);

  if (error) {
    showUserFacingErrorToast("We could not load coding queue. Please try again.");
  }

  return (
    <FeatureGate feature={Feature.MEDICAL_CODING} fallback="upgrade">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Coding Queue</h1>
            <p className="text-muted-foreground">
              Completed visits that are missing diagnosis codes.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative w-64 md:w-80">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by patient name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Badge variant="outline" className="text-lg px-4 py-1">
              {visits.length} Pending
            </Badge>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Un-coded Visits</CardTitle>
            <CardDescription>
              Review and add ICD-10 codes to these completed appointments.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : visits.length === 0 ? (
              <EmptyState
                icon={CheckCircle2}
                title="All caught up!"
                description="No un-coded visits found."
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Doctor</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visits.map((visit) => (
                    <TableRow key={visit.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {format(new Date(visit.startTime), "MMM d, yyyy")}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {visit.patient?.firstName} {visit.patient?.lastName}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <User className="h-4 w-4" />
                          {visit.doctor?.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">
                          {visit.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Link
                          href={`/consultation/${visit.id}?tab=observations&from=coding-queue`}
                        >
                          <Button size="sm" className="gap-2">
                            Code Visit
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </FeatureGate>
  );
}
