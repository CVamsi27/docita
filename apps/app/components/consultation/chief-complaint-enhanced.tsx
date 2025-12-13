"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";
import { Input } from "@workspace/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Badge } from "@workspace/ui/components/badge";
import { AlertTriangle, Clock, Info, TrendingUp } from "lucide-react";
import { Checkbox } from "@workspace/ui/components/checkbox";

interface ChiefComplaintEnhancedProps {
  value: string;
  onChange: (value: string) => void;
  onStructuredDataChange?: (data: ChiefComplaintStructured) => void;
}

export interface ChiefComplaintStructured {
  complaint: string;
  onset: string;
  duration: string;
  durationUnit: "minutes" | "hours" | "days" | "weeks" | "months" | "years";
  location: string;
  quality: string;
  severity: number; // 1-10
  aggravatingFactors: string[];
  relievingFactors: string[];
  radiation: string;
  timing: string;
  associatedSymptoms: string[];
  redFlags: string[];
}

const COMMON_SYMPTOMS = [
  "Fever",
  "Headache",
  "Nausea",
  "Vomiting",
  "Dizziness",
  "Fatigue",
  "Loss of appetite",
  "Weight loss",
  "Night sweats",
  "Shortness of breath",
  "Chest pain",
  "Palpitations",
];

const RED_FLAGS = [
  "Severe sudden onset",
  "Altered consciousness",
  "Difficulty breathing",
  "Chest pain with radiation",
  "Severe headache (worst ever)",
  "Unilateral weakness",
  "Vision changes",
  "High fever (>103°F)",
  "Uncontrolled bleeding",
  "Severe abdominal pain",
];

export function ChiefComplaintEnhanced({
  value,
  onChange,
  onStructuredDataChange,
}: ChiefComplaintEnhancedProps) {
  const [structuredData, setStructuredData] =
    useState<ChiefComplaintStructured>({
      complaint: "",
      onset: "",
      duration: "",
      durationUnit: "days",
      location: "",
      quality: "",
      severity: 5,
      aggravatingFactors: [],
      relievingFactors: [],
      radiation: "",
      timing: "",
      associatedSymptoms: [],
      redFlags: [],
    });

  const [useStructured, setUseStructured] = useState(false);

  const updateStructuredData = (
    field: keyof ChiefComplaintStructured,
    fieldValue: string | number | string[],
  ) => {
    const newData = { ...structuredData, [field]: fieldValue };
    setStructuredData(newData);
    onStructuredDataChange?.(newData);

    // Auto-generate text from structured data
    generateNarrativeText(newData);
  };

  const generateNarrativeText = (data: ChiefComplaintStructured) => {
    const parts: string[] = [];

    if (data.complaint) {
      parts.push(data.complaint);
    }

    if (data.duration && data.durationUnit) {
      parts.push(`for ${data.duration} ${data.durationUnit}`);
    }

    if (data.location) {
      parts.push(`located in ${data.location}`);
    }

    if (data.quality) {
      parts.push(`described as ${data.quality}`);
    }

    if (data.severity > 0) {
      parts.push(`(severity ${data.severity}/10)`);
    }

    if (data.aggravatingFactors.length > 0) {
      parts.push(
        `\n\nAggravating factors: ${data.aggravatingFactors.join(", ")}`,
      );
    }

    if (data.relievingFactors.length > 0) {
      parts.push(`\nRelieving factors: ${data.relievingFactors.join(", ")}`);
    }

    if (data.associatedSymptoms.length > 0) {
      parts.push(
        `\n\nAssociated symptoms: ${data.associatedSymptoms.join(", ")}`,
      );
    }

    if (data.redFlags.length > 0) {
      parts.push(`\n\n⚠️ RED FLAGS: ${data.redFlags.join(", ")}`);
    }

    const narrative = parts.join(" ");
    onChange(narrative);
  };

  const toggleSymptom = (symptom: string) => {
    const current = structuredData.associatedSymptoms;
    const updated = current.includes(symptom)
      ? current.filter((s) => s !== symptom)
      : [...current, symptom];
    updateStructuredData("associatedSymptoms", updated);
  };

  const toggleRedFlag = (flag: string) => {
    const current = structuredData.redFlags;
    const updated = current.includes(flag)
      ? current.filter((f) => f !== flag)
      : [...current, flag];
    updateStructuredData("redFlags", updated);
  };

  return (
    <div className="space-y-6">
      {/* Free Text Entry */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Chief Complaint <span className="text-destructive">*</span>
              </CardTitle>
              <CardDescription>
                Primary reason for visit - brief and descriptive
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="use-structured"
                checked={useStructured}
                onCheckedChange={(checked) =>
                  setUseStructured(checked as boolean)
                }
              />
              <Label
                htmlFor="use-structured"
                className="text-sm cursor-pointer"
              >
                Use structured input (OPQRST)
              </Label>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="e.g., Chest pain, Shortness of breath, Abdominal pain..."
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="min-h-[120px]"
            required
          />
          <div className="mt-2 flex items-start gap-2 text-xs text-muted-foreground">
            <Info className="h-3 w-3 mt-0.5" />
            <span>
              Brief, descriptive statement. Include duration when relevant.
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Structured Input (OPQRST Format) */}
      {useStructured && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">OPQRST Assessment</CardTitle>
              <CardDescription>
                Structured symptom assessment following clinical guidelines
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Onset */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Onset - When did it start?
                </Label>
                <Input
                  placeholder="e.g., 3 days ago, This morning, Suddenly while walking..."
                  value={structuredData.onset}
                  onChange={(e) =>
                    updateStructuredData("onset", e.target.value)
                  }
                />
              </div>

              {/* Duration */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Duration</Label>
                  <Input
                    type="number"
                    placeholder="e.g., 3"
                    value={structuredData.duration}
                    onChange={(e) =>
                      updateStructuredData("duration", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Unit</Label>
                  <Select
                    value={structuredData.durationUnit}
                    onValueChange={(v) =>
                      updateStructuredData("durationUnit", v)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="minutes">Minutes</SelectItem>
                      <SelectItem value="hours">Hours</SelectItem>
                      <SelectItem value="days">Days</SelectItem>
                      <SelectItem value="weeks">Weeks</SelectItem>
                      <SelectItem value="months">Months</SelectItem>
                      <SelectItem value="years">Years</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Location */}
              <div className="space-y-2">
                <Label>Location - Where is it?</Label>
                <Input
                  placeholder="e.g., Left chest, Upper abdomen, Right lower quadrant..."
                  value={structuredData.location}
                  onChange={(e) =>
                    updateStructuredData("location", e.target.value)
                  }
                />
              </div>

              {/* Quality */}
              <div className="space-y-2">
                <Label>Quality/Character - What does it feel like?</Label>
                <Input
                  placeholder="e.g., Sharp, Dull, Throbbing, Burning, Crushing..."
                  value={structuredData.quality}
                  onChange={(e) =>
                    updateStructuredData("quality", e.target.value)
                  }
                />
              </div>

              {/* Severity */}
              <div className="space-y-2">
                <Label className="flex items-center justify-between">
                  <span>Severity (Pain/Distress Scale)</span>
                  <Badge
                    variant={
                      structuredData.severity >= 7 ? "destructive" : "secondary"
                    }
                  >
                    {structuredData.severity}/10
                  </Badge>
                </Label>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={structuredData.severity}
                  onChange={(e) =>
                    updateStructuredData("severity", parseInt(e.target.value))
                  }
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>No pain</span>
                  <span>Mild</span>
                  <span>Moderate</span>
                  <span>Severe</span>
                  <span>Worst possible</span>
                </div>
              </div>

              {/* Radiation */}
              <div className="space-y-2">
                <Label>Radiation - Does it spread anywhere?</Label>
                <Input
                  placeholder="e.g., Radiates to left arm, No radiation..."
                  value={structuredData.radiation}
                  onChange={(e) =>
                    updateStructuredData("radiation", e.target.value)
                  }
                />
              </div>

              {/* Timing */}
              <div className="space-y-2">
                <Label>Timing - Pattern over time?</Label>
                <Input
                  placeholder="e.g., Constant, Intermittent, Worse at night, After meals..."
                  value={structuredData.timing}
                  onChange={(e) =>
                    updateStructuredData("timing", e.target.value)
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Associated Symptoms */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Associated Symptoms</CardTitle>
              <CardDescription>
                Select all symptoms present with the chief complaint
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {COMMON_SYMPTOMS.map((symptom) => (
                  <div key={symptom} className="flex items-center space-x-2">
                    <Checkbox
                      id={`symptom-${symptom}`}
                      checked={structuredData.associatedSymptoms.includes(
                        symptom,
                      )}
                      onCheckedChange={() => toggleSymptom(symptom)}
                    />
                    <Label
                      htmlFor={`symptom-${symptom}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {symptom}
                    </Label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Red Flags */}
          <Card className="border-destructive/30">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Red Flag Symptoms
              </CardTitle>
              <CardDescription>
                Warning signs requiring immediate attention or further
                investigation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {RED_FLAGS.map((flag) => (
                  <div
                    key={flag}
                    className="flex items-center space-x-2 p-2 rounded-lg hover:bg-destructive/5"
                  >
                    <Checkbox
                      id={`redflag-${flag}`}
                      checked={structuredData.redFlags.includes(flag)}
                      onCheckedChange={() => toggleRedFlag(flag)}
                      className="border-destructive data-[state=checked]:bg-destructive"
                    />
                    <Label
                      htmlFor={`redflag-${flag}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {flag}
                    </Label>
                  </div>
                ))}
              </div>
              {structuredData.redFlags.length > 0 && (
                <div className="mt-4 p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
                  <p className="text-sm text-destructive font-medium">
                    ⚠️ {structuredData.redFlags.length} red flag(s) identified -
                    Consider urgent/emergent care
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
