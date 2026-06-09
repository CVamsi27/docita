"use client";

import { Label } from "@workspace/ui/components/form/label";
import { Input } from "@workspace/ui/components/form/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/form/select";
import { Textarea } from "@workspace/ui/components/form/textarea";
import { MicButton } from "@workspace/ui/components/form/mic-button";
import type { ChiefComplaintItem } from "./chief-complaint.types";

interface ComplaintDetailsProps {
  item: ChiefComplaintItem;
  index: number;
  readOnly: boolean;
  isListening: boolean;
  isSupported: boolean;
  isDurationValid: boolean;
  hasComplaint: boolean;
  onMicToggle: () => void;
  onUpdate: (field: keyof ChiefComplaintItem, value: string) => void;
}

export function ComplaintDetails({
  item,
  index,
  readOnly,
  isListening,
  isSupported,
  isDurationValid,
  hasComplaint,
  onMicToggle,
  onUpdate,
}: ComplaintDetailsProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={`chief-complaint-${index}`}>Symptom or concern</Label>
        {!readOnly ? (
          <MicButton
            isListening={isListening}
            isSupported={isSupported}
            onClick={onMicToggle}
            withLabel
          />
        ) : null}
      </div>
      <Input
        id={`chief-complaint-${index}`}
        placeholder="Symptom or concern"
        value={item.complaint}
        onChange={(e) => onUpdate("complaint", e.target.value)}
        readOnly={readOnly}
        className="h-11 bg-background"
      />
      {!readOnly && !hasComplaint ? (
        <p className="text-sm text-warning">
          Enter the main symptom or reason for visit.
        </p>
      ) : null}

      <div className="grid gap-3 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor={`duration-value-${index}`}>Duration</Label>
          <Input
            id={`duration-value-${index}`}
            type="number"
            min="1"
            placeholder="Duration"
            value={item.durationValue}
            onChange={(e) => onUpdate("durationValue", e.target.value)}
            readOnly={readOnly}
            className="h-11 bg-background"
          />
          {!readOnly && hasComplaint && !isDurationValid ? (
            <p className="text-sm text-warning">
              Duration must be greater than 0.
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label>Unit</Label>
          <Select
            value={item.durationUnit}
            onValueChange={(val) => onUpdate("durationUnit", val)}
            disabled={readOnly}
          >
            <SelectTrigger className="h-11 bg-background">
              <SelectValue placeholder="Unit" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hours">Hours</SelectItem>
              <SelectItem value="days">Days</SelectItem>
              <SelectItem value="weeks">Weeks</SelectItem>
              <SelectItem value="months">Months</SelectItem>
              <SelectItem value="years">Years</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Severity</Label>
          <Select
            value={item.severity}
            onValueChange={(val) => onUpdate("severity", val)}
            disabled={readOnly}
          >
            <SelectTrigger className="h-11 bg-background">
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mild">Mild</SelectItem>
              <SelectItem value="moderate">Moderate</SelectItem>
              <SelectItem value="severe">Severe</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`complaint-notes-${index}`}>Clinical notes</Label>
        <Textarea
          id={`complaint-notes-${index}`}
          placeholder="Clinical notes"
          value={item.notes || ""}
          onChange={(e) => onUpdate("notes", e.target.value)}
          readOnly={readOnly}
          className="min-h-[96px] bg-background"
        />
      </div>
    </div>
  );
}
