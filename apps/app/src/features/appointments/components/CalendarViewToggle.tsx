import { useTranslation } from "react-i18next";
import { Button } from "@workspace/ui/components/form/button";

interface CalendarViewToggleProps {
  view: "day" | "week";
  onChange: (view: "day" | "week") => void;
}

export function CalendarViewToggle({ view, onChange }: CalendarViewToggleProps) {
  const { t } = useTranslation("Appointments");
  return (
    <div className="flex w-fit items-center gap-0.5 rounded-[var(--radius-md)] border border-border/60 bg-muted/30 p-0.5">
      <Button
        size="sm"
        variant={view === "day" ? "default" : "ghost"}
        onClick={() => onChange("day")}
      >
        {t("calendarView.day")}
      </Button>
      <Button
        size="sm"
        variant={view === "week" ? "default" : "ghost"}
        onClick={() => onChange("week")}
      >
        {t("calendarView.week")}
      </Button>
    </div>
  );
}
