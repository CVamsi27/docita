"use client";

import { useFeedbackPage } from "./use-feedback-page";
import { FeedbackStatsCards } from "./FeedbackStatsCards";
import { FeedbackFiltersCard } from "./FeedbackFiltersCard";
import { FeedbackListSection } from "./FeedbackListSection";
import { FeedbackViewDialog } from "./FeedbackViewDialog";

import { Button, DataState, PageHeader } from "@workspace/ui/components";
import { Filter, MessageSquare, RefreshCw } from "lucide-react";

export default function FeedbackPage() {
  const {
    feedbacks,
    stats,
    selectedFeedback,
    showFilters,
    filters,
    adminNotes,
    pageStatus,
    errorMessage,
    updateStatusMutation,
    setSelectedFeedback,
    setShowFilters,
    setFilters,
    setAdminNotes,
    handleUpdateStatus,
    handleDelete,
    loadData,
  } = useFeedbackPage();

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <MessageSquare className="h-7 w-7" />
            Feedback Portal
          </span>
        }
        description="View and manage user feedback from all clinics"
        size="compact"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
            <Button variant="outline" onClick={loadData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        }
      />

      <DataState
        status={pageStatus}
        loadingMessage="Loading feedback…"
        errorMessage={errorMessage}
        onRetry={loadData}
      >
        <FeedbackStatsCards stats={stats} />

        <FeedbackFiltersCard
          filters={filters}
          show={showFilters}
          onFiltersChange={setFilters}
        />

        <FeedbackListSection
          feedbacks={feedbacks}
          loading={pageStatus === "loading"}
          onView={setSelectedFeedback}
          onDelete={handleDelete}
          onSetAdminNotes={setAdminNotes}
        />
      </DataState>

      <FeedbackViewDialog
        feedback={selectedFeedback}
        open={!!selectedFeedback}
        adminNotes={adminNotes}
        statusUpdating={updateStatusMutation.isPending}
        onOpenChange={() => setSelectedFeedback(null)}
        onAdminNotesChange={setAdminNotes}
        onUpdateStatus={handleUpdateStatus}
      />
    </div>
  );
}
