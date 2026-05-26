"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { FileText } from "lucide-react";
import type { Appointment } from "@workspace/types";
import { Feature } from "@workspace/types";
import { AppPageScaffold } from "@workspace/ui/components/layout/app-page-scaffold";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { EmptyState } from "@workspace/ui/components/feedback/empty-state";
import { Input } from "@workspace/ui/components/form/input";
import { PageHeader } from "@workspace/ui/components/layout/page-header";
import { useDebounce } from "@workspace/hooks/use-debounce";
import { FeatureGate } from "@/components/auth/feature-gate";
import { CodingQueue } from "@/features/medical-coding/components";
import { useCodingQueue } from "@workspace/data-access";
import { formatDateTime } from "@/lib/formatters";

function formatQueueDate(value: Appointment["startTime"]): string {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  const formatted = formatDateTime(date);
  return formatted.length > 0 ? formatted : "Date unavailable";
}

function formatStatus(status: string): string {
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function getPatientName(appointment: Appointment): string {
  const patient = appointment.patient;
  const fullName = [patient?.firstName, patient?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return fullName || `Patient ${appointment.patientId}`;
}

export default function CodingQueuePage() {
  return <CodingQueuePageContent />;
}
