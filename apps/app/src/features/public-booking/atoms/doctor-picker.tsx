"use client";

// jscpd:ignore-start
import { useTranslation } from "react-i18next";
import { Button, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Skeleton } from "@workspace/ui/components";
import { ANY_DOCTOR_ID } from "@/features/public-booking/public-booking-constants";
import type { PublicBookingPageController } from "@/features/public-booking/use-public-booking-page-state";
import { cn } from "@workspace/ui/lib/utils";

function DoctorRetryButton({ c }: { c: PublicBookingPageController }) {
// jscpd:ignore-end
  const { t } = useTranslation("PublicBooking");

  if (!c.doctorsQuery.isError) return null;
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => void c.doctorsQuery.refetch()}
    >
      {t("doctorPicker.retry")}
    </Button>
  );
}

export function DoctorChips({ c }: { c: PublicBookingPageController }) {
  const { t } = useTranslation("PublicBooking");
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
        {t("doctorPicker.label")}
        <span className="ml-1 font-normal text-muted-foreground/70">
          {t("doctorPicker.optionalSuffix")}
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
            <Button
              variant={(!activeId || activeId === ANY_DOCTOR_ID) ? "default" : "outline"}
              size="sm"
              onClick={() => selectDoctor(ANY_DOCTOR_ID)}
              className={cn(
                "h-9 shrink-0 rounded-full",
                (!activeId || activeId === ANY_DOCTOR_ID)
                  ? ""
                  : "border-border/70 bg-background text-muted-foreground hover:border-primary/35 hover:bg-muted/20 hover:text-foreground",
              )}
            >
              {t("doctorPicker.anyDoctor")}
            </Button>
          ) : null}
          {doctors.map((d) => (
            <Button
              key={d.id}
              variant={activeId === d.id ? "default" : "outline"}
              size="sm"
              onClick={() => selectDoctor(d.id)}
              className={cn(
                "h-9 shrink-0 rounded-full",
                activeId === d.id
                  ? ""
                  : "border-border/70 bg-background text-muted-foreground hover:border-primary/35 hover:bg-muted/20 hover:text-foreground",
              )}
              aria-label={t("doctorPicker.selectNamedAria", {
                name: d.name ?? t("doctorPicker.nameFallback"),
                specialization: d.specialization
                  ? ` (${d.specialization})`
                  : "",
              })}
            >
              {d.name ?? t("doctorPicker.nameFallback")}
              {d.specialization ? (
                <span className="ml-1 opacity-70">· {d.specialization}</span>
              ) : null}
            </Button>
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
  const { t } = useTranslation("PublicBooking");

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-3">
        <Label
          htmlFor={open ? "pb-doctor-select" : undefined}
          className="text-[length:var(--fs-sm)] font-normal leading-none text-muted-foreground"
        >
          {t("doctorPicker.toggleLabel")}
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
          {open
            ? t("doctorPicker.hide")
            : t("doctorPicker.select")}
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
              aria-label={t("doctorPicker.selectAriaLabel")}
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
              <SelectValue placeholder={t("doctorPicker.selectPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {(c.doctorsQuery.data?.doctors ?? []).length > 1 ? (
                <SelectItem value={ANY_DOCTOR_ID}>
                  {t("doctorPicker.anyAvailableDoctor")}
                </SelectItem>
              ) : null}
              {(c.doctorsQuery.data?.doctors ?? []).map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name ?? t("doctorPicker.nameFallback")}
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
          {t("doctorPicker.selectedPrefix")}
          {" "}
          <span className="font-medium text-foreground">
            {c.selectedDoctorName ?? t("doctorPicker.nameFallback")}
          </span>
        </p>
      ) : null}

      <DoctorRetryButton c={c} />
    </div>
  );
}
