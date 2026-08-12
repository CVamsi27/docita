import { QueueConfigurationForm } from "./queue/queue-configuration-form";
import { QueueLiveStatusPanel } from "./queue/queue-live-status-panel";

export const QueueSettings = () => {
  return (
    <div className="flex flex-col gap-6">
      <QueueConfigurationForm />
      <QueueLiveStatusPanel />
    </div>
  );
};
