"use client";

import Link from "next/link";
import { format } from "date-fns";
import {
  ArrowRight,
  Calendar,
  User,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@workspace/ui/components/button";
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
import { apiHooks } from "@/lib/api-hooks";
import { toast } from "sonner";
import { FeatureGate, Feature } from "@/components/common/feature-gate";
import { EmptyState } from "@/components/ui/empty-state";

export default function CodingQueuePage() {
  const { data: visits = [], isLoading, error } = apiHooks.useCodingQueue();

  if (error) {
    toast.error("Failed to load coding queue");
  }

  return (
    <FeatureGate feature={Feature.MEDICAL_CODING} fallback="upgrade">
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Coding Queue</h1>
            <p className="text-muted-foreground">
              Completed visits that are missing diagnosis codes.
            </p>
          </div>
          <Badge variant="outline" className="text-lg px-4 py-1">
            {visits.length} Pending
          </Badge>
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
