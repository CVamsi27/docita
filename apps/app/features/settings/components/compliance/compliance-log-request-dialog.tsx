"use client";

// jscpd:ignore-start
import { FormEvent } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/overlay/dialog";
import { Input } from "@workspace/ui/components/form/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/form/select";
import { Textarea } from "@workspace/ui/components/form/textarea";
import { Button } from "@workspace/ui/components/form/button";
import { IsoDatePickerField } from "@workspace/ui/components/form/iso-date-picker-field";
import type { CreateDataSubjectRequest } from "@workspace/types";
import {
  REQUEST_TYPE_OPTIONS,
// jscpd:ignore-end
  parseDataSubjectRequestType,
} from "./compliance-settings-constants";

export function LogRequestDialog({
  open,
  onOpenChange,
  requestForm,
  onRequestFormChange,
  onSubmit,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestForm: CreateDataSubjectRequest;
  onRequestFormChange: (form: CreateDataSubjectRequest) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  isPending: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Log patient rights request</DialogTitle>
          <DialogDescription>
            Capture the operational request without attaching raw exports or
            unnecessary clinical details.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="request-type">
                Request type
              </label>
              <Select
                value={requestForm.requestType}
                onValueChange={(value) =>
                  onRequestFormChange({
                    ...requestForm,
                    requestType: parseDataSubjectRequestType(value),
                  })
                }
              >
                <SelectTrigger id="request-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REQUEST_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <IsoDatePickerField
              id="request-due"
              label="Due date"
              value={String(requestForm.dueAt ?? "")}
              onChange={(iso) =>
                onRequestFormChange({ ...requestForm, dueAt: iso })
              }
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="patient-id">
                Patient ID
              </label>
              <Input
                id="patient-id"
                value={requestForm.patientId ?? ""}
                placeholder="Patient ID"
                onChange={(event) =>
                  onRequestFormChange({
                    ...requestForm,
                    patientId: event.target.value,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="channel">
                Request channel
              </label>
              <Input
                id="channel"
                value={requestForm.requestChannel ?? ""}
                placeholder="Request channel"
                onChange={(event) =>
                  onRequestFormChange({
                    ...requestForm,
                    requestChannel: event.target.value,
                  })
                }
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="requester">
                Requested by
              </label>
              <Input
                id="requester"
                value={requestForm.requestedByName ?? ""}
                placeholder="Name or initials"
                onChange={(event) =>
                  onRequestFormChange({
                    ...requestForm,
                    requestedByName: event.target.value,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="relation">
                Relation
              </label>
              <Input
                id="relation"
                value={requestForm.requestedByRelation ?? ""}
                placeholder="Relation"
                onChange={(event) =>
                  onRequestFormChange({
                    ...requestForm,
                    requestedByRelation: event.target.value,
                  })
                }
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="details">
              Request details
            </label>
            <Textarea
              id="details"
              value={requestForm.requestDetails ?? ""}
              placeholder="Request details"
              onChange={(event) =>
                onRequestFormChange({
                  ...requestForm,
                  requestDetails: event.target.value,
                })
              }
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              Save request
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
