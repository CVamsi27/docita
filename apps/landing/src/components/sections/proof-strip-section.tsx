import { formatStatValue, type PlatformStats } from "@/lib/landing-data";

interface ProofStripSectionProps {
  stats: PlatformStats | null;
}

const STAT_LABELS = [
  { key: "clinics" as const, label: "Active clinics" },
  { key: "doctors" as const, label: "Doctors on Docita" },
  { key: "patients" as const, label: "Patients managed" },
  { key: "prescriptions" as const, label: "Prescriptions issued" },
];

export function ProofStripSection({ stats }: ProofStripSectionProps) {
  const hasStats =
    stats !== null && Object.values(stats).every((value) => value > 0);

  return (
    <section
      className="r2-section r2-section-tight r2-band-base"
      aria-labelledby="r2-proof-heading"
    >
      <div className="ui-page-shell">
        <div className="flex items-center gap-3">
          <span className="r2-eyebrow">Operating proof</span>
        </div>

        <h2 id="r2-proof-heading" className="sr-only">
          Operating proof and platform stats
        </h2>

        {hasStats ? (
          <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-4">
            {STAT_LABELS.map((stat, i) => (
              <div
                key={stat.key}
                className={
                  i === STAT_LABELS.length - 1
                    ? ""
                    : "sm:border-r sm:border-border/50 sm:pr-6"
                }
              >
                <dd className="r2-proof-stat text-foreground">
                  {formatStatValue(stats[stat.key])}
                </dd>
                <dt className="mt-2 text-sm text-muted-foreground">
                  {stat.label}
                </dt>
              </div>
            ))}
          </dl>
        ) : null}
      </div>
    </section>
  );
}
