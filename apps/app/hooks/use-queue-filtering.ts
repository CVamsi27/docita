"use client";

import { useMemo, useState } from "react";

type SortKey =
  | "token"
  | "type"
  | "patient"
  | "doctor"
  | "time"
  | "wait"
  | "status";

interface SortConfig {
  key: SortKey;
  direction: "asc" | "desc";
}

interface Patient {
  firstName: string;
  lastName: string;
  phoneNumber?: string;
}

interface Doctor {
  name: string;
}

interface QueueItem {
  id: string;
  tokenNumber: number;
  tokenType: string;
  status: string;
  patientId: string;
  appointmentId?: string;
  scheduledTime?: string;
  createdAt: string;
  estimatedWaitTime?: number;
  patient?: Patient;
  doctor?: Doctor;
  appointment?: {
    doctor?: Doctor;
  };
}

export function useQueueFiltering(queue: QueueItem[]) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: "token",
    direction: "asc",
  });

  const handleSort = (key: SortKey) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const filteredQueue = useMemo(() => {
    return queue
      .filter((item) => {
        const patientName = item.patient
          ? `${item.patient.firstName} ${item.patient.lastName}`.toLowerCase()
          : "";
        const doctorName =
          item.doctor?.name?.toLowerCase() ||
          item.appointment?.doctor?.name?.toLowerCase() ||
          "";
        const tokenStr =
          `A${String(item.tokenNumber).padStart(3, "0")}`.toLowerCase();
        const search = searchQuery.toLowerCase();

        return (
          patientName.includes(search) ||
          tokenStr.includes(search) ||
          doctorName.includes(search)
        );
      })
      .sort((a, b) => {
        let aValue: string | number | Date = "";
        let bValue: string | number | Date = "";

        switch (sortConfig.key) {
          case "token":
            aValue = a.tokenNumber || 0;
            bValue = b.tokenNumber || 0;
            break;
          case "type":
            aValue = a.tokenType || "";
            bValue = b.tokenType || "";
            break;
          case "patient":
            aValue = a.patient
              ? `${a.patient.firstName} ${a.patient.lastName}`.toLowerCase()
              : "";
            bValue = b.patient
              ? `${b.patient.firstName} ${b.patient.lastName}`.toLowerCase()
              : "";
            break;
          case "doctor":
            aValue = (
              a.doctor?.name ||
              a.appointment?.doctor?.name ||
              ""
            ).toLowerCase();
            bValue = (
              b.doctor?.name ||
              b.appointment?.doctor?.name ||
              ""
            ).toLowerCase();
            break;
          case "time":
            aValue = new Date(a.scheduledTime || a.createdAt).getTime();
            bValue = new Date(b.scheduledTime || b.createdAt).getTime();
            break;
          case "wait":
            aValue = a.estimatedWaitTime || 0;
            bValue = b.estimatedWaitTime || 0;
            break;
          case "status":
            aValue = a.status || "";
            bValue = b.status || "";
            break;
        }

        if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
  }, [queue, searchQuery, sortConfig]);

  return {
    searchQuery,
    setSearchQuery,
    sortConfig,
    handleSort,
    filteredQueue,
  };
}
