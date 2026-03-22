import { StatusBadge, PriorityBadge } from '@workspace/ui/components/status-badge';

export default function StatusBadgeVisualTest() {
  const statuses = [
    'completed', 'confirmed', 'scheduled', 'cancelled',
    'pending', 'in-progress', 'active', 'inactive',
    'paid', 'unpaid', 'success', 'warning', 'error', 'info'
  ];

  const priorities = ['low', 'medium', 'high', 'urgent', 'critical'];

  return (
    <div className="p-8 space-y-12 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold mb-2">StatusBadge Visual Test</h1>
        <p className="text-muted-foreground">
          Testing all status badge variants in light and dark modes
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">All Status Variants</h2>
        <div className="flex flex-wrap gap-3">
          {statuses.map(status => (
            <StatusBadge key={status} status={status} label={status} />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Size Variants</h2>
        <div className="flex gap-4 items-center">
          <StatusBadge status="active" size="sm" label="Small Active" />
          <StatusBadge status="active" size="default" label="Default Active" />
        </div>
        <div className="flex gap-4 items-center">
          <StatusBadge status="pending" size="sm" label="Small Pending" />
          <StatusBadge status="pending" size="default" label="Default Pending" />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Priority Badges</h2>
        <div className="flex flex-wrap gap-3">
          {priorities.map(priority => (
            <PriorityBadge key={priority} priority={priority} />
          ))}
        </div>
        <div className="flex flex-wrap gap-3">
          <p className="text-sm text-muted-foreground w-full">Without dots:</p>
          {priorities.map(priority => (
            <PriorityBadge key={`no-dot-${priority}`} priority={priority} showDot={false} />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Common Use Cases</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border rounded-lg p-4">
            <h3 className="font-medium mb-2">Appointment Status</h3>
            <div className="flex gap-2">
              <StatusBadge status="scheduled" label="Scheduled" />
              <StatusBadge status="confirmed" label="Confirmed" />
              <StatusBadge status="completed" label="Completed" />
            </div>
          </div>
          <div className="border rounded-lg p-4">
            <h3 className="font-medium mb-2">Payment Status</h3>
            <div className="flex gap-2">
              <StatusBadge status="paid" label="Paid" />
              <StatusBadge status="unpaid" label="Unpaid" />
              <StatusBadge status="pending" label="Pending" />
            </div>
          </div>
          <div className="border rounded-lg p-4">
            <h3 className="font-medium mb-2">User Status</h3>
            <div className="flex gap-2">
              <StatusBadge status="active" label="Active" />
              <StatusBadge status="inactive" label="Inactive" />
            </div>
          </div>
          <div className="border rounded-lg p-4">
            <h3 className="font-medium mb-2">Generic Status</h3>
            <div className="flex gap-2">
              <StatusBadge status="success" label="Success" />
              <StatusBadge status="warning" label="Warning" />
              <StatusBadge status="error" label="Error" />
              <StatusBadge status="info" label="Info" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
