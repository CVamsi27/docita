import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiHooks } from "@/lib/api-hooks";
import { apiFetch } from "@/lib/api-client";
import { useQueueFiltering } from "@/hooks/use-queue-filtering";
import { useConstants } from "@/features/_shared/hooks/use-constants";
import { useDebounce } from "@/hooks/use-debounce";

export const useQueueLogic = () => {
    const [selectedDoctor, setSelectedDoctor] = useState<string>("");
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const queryClient = useQueryClient();

    const { data: queueSettings, refetch: refetchSettings } =
        apiHooks.useQueueSettings();

    const [searchQuery, setSearchQuery] = useState("");
    const debouncedSearch = useDebounce(searchQuery, 300);

    const {
        data: queue = [],
        isLoading,
        refetch,
        isFetching,
    } = apiHooks.useQueueByDoctor(
        queueSettings?.useDoctorQueues && selectedDoctor
            ? selectedDoctor
            : undefined,
        debouncedSearch,
    );

    const { data: stats, refetch: refetchStats } = apiHooks.useQueueStats(
        queueSettings?.useDoctorQueues && selectedDoctor
            ? selectedDoctor
            : undefined,
        debouncedSearch,
    );

    const { data: doctors = [] } = apiHooks.useDoctors();
    const { data: constants } = useConstants();

    const { sortConfig, handleSort, filteredQueue } =
        useQueueFiltering(queue);

    const handleRefresh = useCallback(() => {
        refetch();
        refetchStats();
        queryClient.invalidateQueries({ queryKey: ["queue"] });
    }, [refetch, refetchStats, queryClient]);

    const handleUpdateStatus = async (id: string, status: string) => {
        try {
            await apiFetch(`/queue/${id}`, {
                method: "PATCH",
                body: JSON.stringify({ status }),
            });

            // Use labels from backend constants for the toast
            const statusLabel = constants?.queueStatuses?.find(s => s.value === status)?.label;
            const message = statusLabel
                ? `Status updated to ${statusLabel}`
                : "Status updated";

            toast.success(message);
            handleRefresh();
        } catch (error) {
            console.error("Failed to update status:", error);
            // apiFetch throws errors provided by the backend usually, but if not we can have a fallback
            const msg = error instanceof Error ? error.message : "Failed to update status";
            toast.error(msg);
        }
    };

    return {
        state: {
            queue: filteredQueue, // Return filtered queue directly
            stats,
            doctors,
            isLoading,
            isFetching,
            queueSettings,
            selectedDoctor,
            showSettingsModal,
            searchQuery,
            sortConfig,
            useDoctorQueues: queueSettings?.useDoctorQueues,
        },
        handlers: {
            setSelectedDoctor,
            setShowSettingsModal,
            setSearchQuery,
            handleSort,
            handleRefresh,
            handleUpdateStatus,
            refetchSettings,
        }
    };
};
