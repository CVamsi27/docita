"use client";

import { useState, useCallback } from "react";
import { FeatureGate, Feature } from "@/components/common/feature-gate";
import { apiHooks } from "@/lib/api-hooks";
import { API_URL } from "@/lib/api";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

import { QueueHeader } from "@/components/queue/queue-header";
import { QueueStats } from "@/components/queue/queue-stats";
import { QueueFilters } from "@/components/queue/queue-filters";
import { QueueTable } from "@/components/queue/queue-table";
import { QueueSettingsDialog } from "@/components/queue/queue-settings-dialog";
import { useQueueFiltering } from "@/hooks/use-queue-filtering";

export default function QueuePage() {
  const [selectedDoctor, setSelectedDoctor] = useState<string>("");
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const queryClient = useQueryClient();

  const { data: queueSettings, refetch: refetchSettings } =
    apiHooks.useQueueSettings();

  const {
    data: queue = [],
    isLoading,
    refetch,
    isFetching,
  } = apiHooks.useQueueByDoctor(
    queueSettings?.useDoctorQueues && selectedDoctor
      ? selectedDoctor
      : undefined,
  );

  const { data: stats, refetch: refetchStats } = apiHooks.useQueueStats(
    queueSettings?.useDoctorQueues && selectedDoctor
      ? selectedDoctor
      : undefined,
  );

  const { data: doctors = [] } = apiHooks.useDoctors();

  const { searchQuery, setSearchQuery, sortConfig, handleSort, filteredQueue } =
    useQueueFiltering(queue);

  const handleRefresh = useCallback(() => {
    refetch();
    refetchStats();
    queryClient.invalidateQueries({ queryKey: ["queue"] });
  }, [refetch, refetchStats, queryClient]);

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      const response = await fetch(`${API_URL}/queue/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("docita_token")}`,
        },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        const statusMessages: Record<string, string> = {
          "in-progress": "Patient called for consultation",
          completed: "Consultation marked as completed",
          "no-show": "Patient marked as no-show",
          cancelled: "Appointment cancelled",
        };
        toast.success(statusMessages[status] || "Status updated");
        handleRefresh();
      } else {
        const error = await response.json();
        toast.error(error.message || "Failed to update status");
      }
    } catch (error) {
      console.error("Failed to update status:", error);
      toast.error("Failed to update status");
    }
  };

  return (
    <FeatureGate
      feature={Feature.QUEUE_MANAGEMENT}
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
          <h2 className="text-2xl font-bold mb-2">Queue Management</h2>
          <p className="text-muted-foreground mb-4">
            Upgrade to access queue management features
          </p>
        </div>
      }
    >
      <div className="flex flex-col gap-6 p-4 md:p-6">
        <QueueHeader
          onRefresh={handleRefresh}
          isFetching={isFetching}
          onOpenSettings={() => setShowSettingsModal(true)}
          doctors={doctors}
          useDoctorQueues={queueSettings?.useDoctorQueues}
        />

        <QueueStats stats={stats} />

        <QueueFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedDoctor={selectedDoctor}
          onDoctorChange={setSelectedDoctor}
          doctors={doctors}
          showDoctorFilter={!!queueSettings?.useDoctorQueues}
        />

        <QueueTable
          queue={filteredQueue}
          isLoading={isLoading}
          sortConfig={sortConfig}
          onSort={handleSort}
          onUpdateStatus={handleUpdateStatus}
        />

        <QueueSettingsDialog
          open={showSettingsModal}
          onOpenChange={setShowSettingsModal}
          settings={queueSettings ?? null}
          onSettingsUpdated={() => {
            refetchSettings();
            handleRefresh();
          }}
        />
      </div>
    </FeatureGate>
  );
}
