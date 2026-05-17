"use client";

import { DocitaLoadingIndicator } from "@workspace/ui/components/docita-loading-indicator";

import { useEffect, useMemo, useState } from "react";
import {
  useClinicMembers,
  useCreateDoctorTimeOff,
  useDeleteDoctorTimeOffMutation,
  useDoctorTimeOffs,
} from "@/hooks/api/use-settings";
import { useAuth } from "@/lib/auth/auth-context";
import { toast } from "sonner";
import { formatDate } from "@workspace/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Label } from "@workspace/ui/components/label";
import { Button } from "@workspace/ui/components/button";
import { SymbolTooltip } from "@workspace/ui/components/tooltip";
import { Input } from "@workspace/ui/components/input";
import { Switch } from "@workspace/ui/components/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Trash2 } from "lucide-react";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import { IsoDatePickerField } from "@workspace/ui/components/iso-date-picker-field";

export function DoctorTimeAwaySettings() {
  const { user, isAdmin } = useAuth();
  const { data: members = [] } = useClinicMembers();

  const doctors = useMemo(
    () =>
      members.filter(
        (m) => m.role === "DOCTOR" || m.role === "ADMIN_DOCTOR",
      ),
    [members],
  );

  const [selectedDoctorId, setSelectedDoctorId] = useState<string>("me");

  useEffect(() => {
    if (isAdmin && doctors.length > 0 && selectedDoctorId === "me") {
      setSelectedDoctorId(doctors[0]?.id ?? "me");
    }
  }, [isAdmin, doctors, selectedDoctorId]);

  const queryDoctorId =
    isAdmin && selectedDoctorId !== "me" ? selectedDoctorId : undefined;

  const { data: timeOffs = [], isLoading } = useDoctorTimeOffs(
    queryDoctorId,
    false,
  );

  const createMutation = useCreateDoctorTimeOff();
  const deleteMutation = useDeleteDoctorTimeOffMutation();

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [isFullDay, setIsFullDay] = useState(true);
  const [partialStart, setPartialStart] = useState("09:00");
  const [partialEnd, setPartialEnd] = useState("17:00");

  const resetForm = () => {
    setStartDate("");
    setEndDate("");
    setReason("");
    setIsFullDay(true);
    setPartialStart("09:00");
    setPartialEnd("17:00");
  };

  const handleCreate = async () => {
    if (!startDate.trim() || !endDate.trim()) {
      showUserFacingErrorToast(
        null,
        "Choose a start date and end date for time away.",
        "form",
      );
      return;
    }
    if (!isFullDay && (!partialStart.trim() || !partialEnd.trim())) {
      showUserFacingErrorToast(
        null,
        "Partial days require start and end times.",
        "form",
      );
      return;
    }

    try {
      await createMutation.mutateAsync({
        ...(isAdmin && selectedDoctorId !== "me"
          ? { doctorId: selectedDoctorId }
          : {}),
        startDate,
        endDate,
        reason: reason.trim() || undefined,
        isFullDay,
        ...(!isFullDay
          ? { startTime: partialStart, endTime: partialEnd }
          : {}),
      });
      toast.success("Time away saved");
      resetForm();
    } catch (error) {
      showUserFacingErrorToast(
        error,
        "We could not save this time away. Please try again.",
        "save",
      );
    }
  };

  const upcomingSorted = useMemo(() => {
    const now = Date.now();
    return [...timeOffs].sort((a, b) => {
      const ta = new Date(a.endDate).getTime();
      const tb = new Date(b.endDate).getTime();
      if (ta >= now && tb >= now) return ta - tb;
      return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
    });
  }, [timeOffs]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Time away</CardTitle>
        <CardDescription>
          Block your calendar for holidays or other full-day absences. This is
          separate from leave requests under the Leave tab, which track balances
          and approvals.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isAdmin && doctors.length > 0 ? (
          <div className="space-y-2">
            <Label htmlFor="time-away-doctor">Doctor</Label>
            <Select
              value={selectedDoctorId}
              onValueChange={setSelectedDoctorId}
            >
              <SelectTrigger id="time-away-doctor" className="w-full sm:w-72">
                <SelectValue placeholder="Doctor" />
              </SelectTrigger>
              <SelectContent>
                {doctors.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <IsoDatePickerField
            id="time-away-start"
            label="Start date"
            value={startDate}
            onChange={setStartDate}
          />
          <IsoDatePickerField
            id="time-away-end"
            label="End date"
            value={endDate}
            onChange={setEndDate}
          />
          <div className="space-y-2 sm:col-span-2 lg:col-span-1">
            <Label htmlFor="time-away-reason">Reason (optional)</Label>
            <Input
              id="time-away-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason"
              maxLength={200}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
          <Switch
            id="time-away-full-day"
            checked={isFullDay}
            onCheckedChange={setIsFullDay}
          />
          <Label htmlFor="time-away-full-day" className="cursor-pointer">
            Full day each day
          </Label>
        </div>

        {!isFullDay ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="time-away-partial-start">Away from</Label>
              <Input
                id="time-away-partial-start"
                type="time"
                value={partialStart}
                onChange={(e) => setPartialStart(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time-away-partial-end">Away until</Label>
              <Input
                id="time-away-partial-end"
                type="time"
                value={partialEnd}
                onChange={(e) => setPartialEnd(e.target.value)}
              />
            </div>
          </div>
        ) : null}

        <Button
          type="button"
          onClick={() => void handleCreate()}
          disabled={createMutation.isPending}
        >
          {createMutation.isPending ? (
            <>
              <DocitaLoadingIndicator variant="inline" decorative className="mr-2" />
              Saving
            </>
          ) : (
            "Add time away"
          )}
        </Button>

        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Scheduled time away</h3>
          {isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : upcomingSorted.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No time away recorded yet.
            </p>
          ) : (
            <ul className="divide-y divide-border rounded-md border">
              {upcomingSorted.map((off) => {
                const start = new Date(off.startDate);
                const end = new Date(off.endDate);
                const canDelete =
                  user?.role === "ADMIN" ||
                  user?.role === "ADMIN_DOCTOR" ||
                  off.doctorId === user?.id;

                return (
                  <li
                    key={off.id}
                    className="flex flex-wrap items-start justify-between gap-2 px-3 py-3 text-sm"
                  >
                    <div>
                      <div className="font-medium">
                        {formatDate(start, "MMM d, yyyy")}
                        {" – "}
                        {formatDate(end, "MMM d, yyyy")}
                        {!off.isFullDay && off.startTime && off.endTime
                          ? ` (${off.startTime}–${off.endTime})`
                          : null}
                      </div>
                      {off.reason ? (
                        <div className="text-muted-foreground">{off.reason}</div>
                      ) : null}
                    </div>
                    {canDelete && off.id ? (
                      <SymbolTooltip label="Remove time away">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="shrink-0 text-destructive hover:text-destructive"
                          aria-label="Remove time away"
                          disabled={deleteMutation.isPending}
                          onClick={async () => {
                            try {
                              await deleteMutation.mutateAsync(off.id!);
                              toast.success("Time away removed");
                            } catch (error) {
                              showUserFacingErrorToast(
                                error,
                                "We could not remove this entry. Please try again.",
                                "save",
                              );
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </SymbolTooltip>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
