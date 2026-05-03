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

const OPERATING_FACTS = [
  { value: "Mumbai", label: "India residency · ap-south-1" },
  { value: "DPDP", label: "Consent-aware workflows" },
  { value: "Excel ↔ CSV", label: "Bring your patient list" },
  { value: "Role-based", label: "Reception · doctor · admin" },
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
        <div className="flex items-center gap-3 r2-section-marker">
          <span aria-hidden>R2 / 02</span>
          <span aria-hidden className="h-px w-10 bg-current opacity-30" />
          <span className="r2-eyebrow">Operating proof</span>
        </div>

        <h2 id="r2-proof-heading" className="sr-only">
          Operating proof and platform stats
        </h2>

        {hasStats ? (
          <dl className="mt-8 grid grid-cols-2 gap-y-6 sm:grid-cols-4">
            {STAT_LABELS.map((stat, i) => (
              <div
                key={stat.key}
                className={
                  i === STAT_LABELS.length - 1
                    ? ""
                    : "sm:border-r sm:border-border/50 sm:pr-6"
                }
              >
                <dt className="r2-eyebrow text-muted-foreground">{stat.label}</dt>
                <dd className="mt-2 r2-proof-stat text-foreground">
                  {formatStatValue(stats[stat.key])}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}

        <div className="mt-10 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-border/50 pt-8 sm:grid-cols-4">
          {OPERATING_FACTS.map((fact) => (
            <div key={fact.label}>
              <p className="r2-mono text-sm font-semibold text-foreground">
                {fact.value}
              </p>
              <p className="mt-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                {fact.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
