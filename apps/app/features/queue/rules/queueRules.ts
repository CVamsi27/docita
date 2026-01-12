/**
 * Queue Business Rules
 * Pure functions for queue-related logic
 */

export interface QueueItem {
    id: string;
    patientId: string;
    appointmentId?: string;
    status: "waiting" | "in-progress" | "completed" | "no-show" | "cancelled";
    checkInTime: Date;
    priority: "normal" | "urgent" | "emergency";
    estimatedWaitTime?: number;
}

/**
 * Calculate estimated wait time based on queue position and average consultation time
 */
export function calculateEstimatedWaitTime(
    position: number,
    averageConsultationMinutes: number = 15
): number {
    return position * averageConsultationMinutes;
}

/**
 * Get queue priority label
 */
export function getQueuePriorityLabel(priority: QueueItem["priority"]): string {
    const labels = {
        normal: "Normal",
        urgent: "Urgent",
        emergency: "Emergency",
    };
    return labels[priority] || "Normal";
}

/**
 * Check if patient can be called next
 */
export function canCallPatient(item: QueueItem): boolean {
    return item.status === "waiting";
}

/**
 * Check if patient can be marked as completed
 */
export function canCompletePatient(item: QueueItem): boolean {
    return item.status === "in-progress";
}

/**
 * Sort queue by priority and check-in time
 */
export function sortQueue(items: QueueItem[]): QueueItem[] {
    const priorityOrder = { emergency: 0, urgent: 1, normal: 2 };
    return [...items].sort((a, b) => {
        // First by priority
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDiff !== 0) return priorityDiff;
        // Then by check-in time (earlier first)
        return new Date(a.checkInTime).getTime() - new Date(b.checkInTime).getTime();
    });
}

/**
 * Get queue statistics
 */
export function getQueueStats(items: QueueItem[]) {
    return {
        waiting: items.filter((i) => i.status === "waiting").length,
        inProgress: items.filter((i) => i.status === "in-progress").length,
        completed: items.filter((i) => i.status === "completed").length,
        noShow: items.filter((i) => i.status === "no-show").length,
        total: items.length,
    };
}

/**
 * Calculate average wait time from completed items
 */
export function calculateAverageWaitTime(
    completedItems: Array<{ checkInTime: Date; startTime?: Date }>
): number {
    const validItems = completedItems.filter((i) => i.startTime);
    if (validItems.length === 0) return 0;

    const totalWait = validItems.reduce((sum, item) => {
        const wait =
            new Date(item.startTime!).getTime() - new Date(item.checkInTime).getTime();
        return sum + wait;
    }, 0);

    return Math.round(totalWait / validItems.length / 60000); // Convert to minutes
}
