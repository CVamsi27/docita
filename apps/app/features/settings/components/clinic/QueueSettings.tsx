"use client";

import { QueueConfigurationForm } from "./queue/queue-configuration-form";
import { QueueLiveStatusPanel } from "./queue/queue-live-status-panel";

export const QueueSettings = () => {
  return (
    <div className="space-y-6">
      <QueueConfigurationForm />
      <QueueLiveStatusPanel />
    </div>
  );
};
