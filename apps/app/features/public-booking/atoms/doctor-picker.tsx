"use client";

// jscpd:ignore-start
import {
  Button,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton
} from "@workspace/ui/components";
import { ANY_DOCTOR_ID } from "@/features/public-booking/public-booking-constants";
import type { PublicBookingPageController } from "@/features/public-booking/use-public-booking-page-state";
import { cn } from "@workspace/ui/lib/utils";

function DoctorRetryButton({ c }: { c: PublicBookingPageController }) {
// jscpd:ignore-end
  if (!c.doctorsQuery.isError) return null;
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => void c.doctorsQuery.refetch()}
    >
      Retry loading doctors
    </Button>
  );
}

export function DoctorChips({ c }: { c: PublicBookingPageController }) {
  const doctors = c.doctorsQuery.data?.doctors ?? [];
  const activeId = c.doctorId;

  function selectDoctor(id: string) {
    c.setDoctorId(id);
    c.clearSlotSelection();
    c.setSubmitFieldErrors((prev) => {
      const next = { ...prev };
      delete next.preferredDoctorId;
      return next;
    });
  }

  return (
    <div className="grid gap-2">
      <Label className="text-[length:var(--fs-sm)] font-normal leading-none text-muted-foreground">
        Doctor
        <span className="ml-1 font-normal text-muted-foreground/70">
          (optional)
        </span>
      </Label>
      {c.doctorsQuery.isLoading ? (
        <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-24 shrink-0 rounded-full" />
          ))}
        </div>
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
          {doctors.length > 1 ? (
            <button
              type="button"
              onClick={() => selectDoctor(ANY_DOCTOR_ID)}
              className={cn(
                "h-9 shrink-0 rounded-full border px-3.5 text-[length:var(--fs-xs)] font-medium transition-colors duration-150 touch-manipulation",
                !activeId || activeId === ANY_DOCTOR_ID
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border/70 bg-background text-muted-foreground hover:border-primary/35 hover:bg-muted/20 hover:text-foreground",
              )}
            >
              Any doctor
            </button>
          ) : null}
          {doctors.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => selectDoctor(d.id)}
              className={cn(
                "h-9 shrink-0 rounded-full border px-3.5 text-[length:var(--fs-xs)] font-medium transition-colors duration-150 touch-manipulation",
                activeId === d.id
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border/70 bg-background text-muted-foreground hover:border-primary/35 hover:bg-muted/20 hover:text-foreground",
              )}
            >
              {d.name ?? "Doctor"}
              {d.specialization ? (
                <span className="ml-1 opacity-70">· {d.specialization}</span>
              ) : null}
            </button>
          ))}
        </div>
      )}
      {c.submitFieldErrors.preferredDoctorId ? (
        <p
          role="alert"
          className="text-[length:var(--fs-xs)] leading-snug text-destructive"
        >
          {c.submitFieldErrors.preferredDoctorId}
        </p>
      ) : null}
      <DoctorRetryButton c={c} />
    </div>
  );
}

export function DoctorTogglePicker({
  c,
  open,
  onToggle,
}: {
  c: PublicBookingPageController;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-3">
        <Label className="text-[length:var(--fs-sm)] font-normal leading-none text-muted-foreground">
          Doctor (optional)
        </Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 rounded-[var(--radius-md)]"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls="pb-doctor-picker"
        >
          {open ? "Hide doctor" : "Select doctor"}
        </Button>
      </div>

      {open ? (
        <div id="pb-doctor-picker" className="grid gap-2">
          <Select
            value={c.doctorId}
            onValueChange={(v) => {
              c.setDoctorId(v);
              c.clearSlotSelection();
              c.setSubmitFieldErrors((prev) => {
                const next = { ...prev };
                delete next.preferredDoctorId;
                return next;
              });
            }}
          >
            <SelectTrigger
              id="pb-doctor-select"
              className={cn(
                "h-11 w-full rounded-[var(--radius-md)] border-border/70 bg-background text-[length:var(--fs-sm)] shadow-sm sm:h-11",
                c.submitFieldErrors.preferredDoctorId && "border-destructive",
              )}
              aria-label="Doctor"
              aria-invalid={
                c.submitFieldErrors.preferredDoctorId ? true : undefined
              }
              aria-describedby={
                c.submitFieldErrors.preferredDoctorId
                  ? "pb-doctor-select-error"
                  : undefined
              }
              disabled={c.doctorsQuery.isLoading}
            >
              <SelectValue placeholder="Select a doctor" />
            </SelectTrigger>
            <SelectContent>
              {(c.doctorsQuery.data?.doctors ?? []).length > 1 ? (
                <SelectItem value={ANY_DOCTOR_ID}>
                  Any available doctor
                </SelectItem>
              ) : null}
              {(c.doctorsQuery.data?.doctors ?? []).map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name ?? "Doctor"}
                  {d.specialization ? ` - ${d.specialization}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {c.submitFieldErrors.preferredDoctorId ? (
            <p
              id="pb-doctor-select-error"
              role="alert"
              className="text-[length:var(--fs-xs)] leading-snug text-destructive"
            >
              {c.submitFieldErrors.preferredDoctorId}
            </p>
          ) : null}
        </div>
      ) : null}

      {!open && c.doctorId ? (
        <p className="text-[length:var(--fs-xs)] leading-snug text-muted-foreground">
          Selected:{" "}
          <span className="font-medium text-foreground">
            {c.selectedDoctorName ?? "Doctor"}
          </span>
        </p>
      ) : null}

      <DoctorRetryButton c={c} />
    </div>
  );
}
