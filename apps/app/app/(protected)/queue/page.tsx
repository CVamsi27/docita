"use client";

import { Feature, FeatureGate } from "@/features/_shared/components/feature-gate";
import {
  QueueFilters,
  QueueHeader,
  QueueSettingsDialog,
  QueueStats,
  QueueTable,
} from "@/features/queue/components/exports";
import { useQueueLogic } from "@/features/queue/hooks/use-queue-logic";

export default function QueuePage() {
  const { state, handlers } = useQueueLogic();

  const {
      queue,
      stats,
      doctors,
      isLoading,
      isFetching,
      queueSettings,
      selectedDoctor,
      showSettingsModal,
      searchQuery,
      sortConfig,
      useDoctorQueues,
  } = state;

  const {
      setSelectedDoctor,
      setShowSettingsModal,
      setSearchQuery,
      handleSort,
      handleRefresh,
      handleUpdateStatus,
      refetchSettings,
  } = handlers;

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
          useDoctorQueues={useDoctorQueues}
        />

        <QueueStats stats={stats} />

        <QueueFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedDoctor={selectedDoctor}
          onDoctorChange={setSelectedDoctor}
          doctors={doctors}
          showDoctorFilter={!!useDoctorQueues}
        />

        <QueueTable
          queue={queue}
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
