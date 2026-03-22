import {
  GradientStatCard,
  QuickActionCard,
  ProgressStat,
} from "@workspace/ui/components/stats-card";
import { Users, DollarSign, Calendar, Activity } from "lucide-react";

export default function StatsCardVisualTest() {
  return (
    <div className="p-8 space-y-8">
      <section data-testid="gradient-cards">
        <h2 className="text-2xl font-bold mb-4">Gradient Stat Cards</h2>
        <div className="grid grid-cols-2 gap-4">
          <GradientStatCard
            variant="primary"
            title="Primary Variant"
            value="1,234"
            icon={Users}
          />
          <GradientStatCard
            variant="success"
            title="Success Variant"
            value="$45,678"
            icon={DollarSign}
          />
          <GradientStatCard
            variant="info"
            title="Info Variant"
            value="89"
            icon={Calendar}
          />
          <GradientStatCard
            variant="warning"
            title="Warning Variant"
            value="12"
            icon={Activity}
          />
        </div>
      </section>

      <section data-testid="gradient-with-subtitle">
        <h2 className="text-2xl font-bold mb-4">With Subtitle</h2>
        <div className="grid grid-cols-2 gap-4">
          <GradientStatCard
            variant="primary"
            title="Total Revenue"
            value="$45,678"
            subtitle="this month"
            icon={DollarSign}
          />
          <GradientStatCard
            variant="success"
            title="Growth"
            value="+23%"
            subtitle="vs last month"
            icon={Activity}
          />
        </div>
      </section>

      <section data-testid="quick-action-cards">
        <h2 className="text-2xl font-bold mb-4">Quick Action Cards</h2>
        <div className="grid grid-cols-4 gap-4">
          <QuickActionCard variant="primary" icon={Users} label="Primary" />
          <QuickActionCard variant="success" icon={DollarSign} label="Success" />
          <QuickActionCard variant="info" icon={Calendar} label="Info" />
          <QuickActionCard variant="warning" icon={Activity} label="Warning" />
        </div>
      </section>

      <section data-testid="quick-action-with-badge">
        <h2 className="text-2xl font-bold mb-4">Quick Action With Badge</h2>
        <div className="grid grid-cols-4 gap-4">
          <QuickActionCard
            variant="primary"
            icon={Users}
            label="Add Patient"
            badge={5}
          />
          <QuickActionCard
            variant="info"
            icon={Calendar}
            label="Appointments"
            badge={12}
          />
        </div>
      </section>

      <section data-testid="progress-stats">
        <h2 className="text-2xl font-bold mb-4">Progress Stats</h2>
        <div className="space-y-4 max-w-md">
          <ProgressStat
            label="Primary Progress"
            value="75%"
            progress={75}
            variant="primary"
          />
          <ProgressStat
            label="Success Progress"
            value="90%"
            progress={90}
            variant="success"
          />
          <ProgressStat
            label="Info Progress"
            value="60%"
            progress={60}
            variant="info"
          />
          <ProgressStat
            label="Warning Progress"
            value="40%"
            progress={40}
            variant="warning"
          />
        </div>
      </section>

      <section data-testid="progress-with-description">
        <h2 className="text-2xl font-bold mb-4">Progress With Description</h2>
        <div className="space-y-4 max-w-md">
          <ProgressStat
            label="Storage Used"
            value="4.2 GB / 10 GB"
            progress={42}
            variant="info"
            description="Upgrade to get more storage"
          />
          <ProgressStat
            label="Appointment Capacity"
            value="78%"
            progress={78}
            variant="success"
            description="You're efficiently managing your schedule"
          />
        </div>
      </section>
    </div>
  );
}
