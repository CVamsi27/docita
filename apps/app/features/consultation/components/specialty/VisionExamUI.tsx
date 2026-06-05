import { Input } from "@workspace/ui/components/form/input";
import { Label } from "@workspace/ui/components/form/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/data-display/table";
import { cn } from "@workspace/ui/lib/utils";

import { OphthalmologyExamData } from "@workspace/types";
import {
  getVisionExamFieldValue,
  updateVisionExamField,
  VISION_EXAM_FIELDS,
  type VisionExamFieldKey,
  type VisionEyeKey,
} from "./vision-exam-fields";

interface VisionExamProps {
  value: OphthalmologyExamData;
  onChange: (value: OphthalmologyExamData) => void;
  readOnly?: boolean;
}

export function VisionExamUI({ value, onChange, readOnly }: VisionExamProps) {
  const handleChange = (
    eye: VisionEyeKey,
    field: VisionExamFieldKey,
    val: string,
  ) => {
    if (readOnly) return;
    onChange(updateVisionExamField(value, eye, field, val));
  };

  const eyes = [
    { key: "OD" as const, label: "OD (Right Eye)", color: "text-info" },
    { key: "OS" as const, label: "OS (Left Eye)", color: "text-success" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Refraction & Visual Acuity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 md:hidden">
          {eyes.map((eye) => (
            <div key={eye.key} className="ui-card-surface space-y-3 p-4">
              <p className={cn("text-sm font-semibold", eye.color)}>
                {eye.label}
              </p>
              <div className="grid grid-cols-2 gap-3">
                {VISION_EXAM_FIELDS.map((field) => (
                  <div key={field.key} className="space-y-1.5">
                    <Label className="text-xs">{field.label}</Label>
                    <Input
                      value={getVisionExamFieldValue(value, eye.key, field.key)}
                      onChange={(e) =>
                        handleChange(eye.key, field.key, e.target.value)
                      }
                      placeholder={field.placeholder}
                      readOnly={readOnly}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="hidden overflow-x-auto overscroll-x-contain md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Eye</TableHead>
                {VISION_EXAM_FIELDS.map((field) => (
                  <TableHead key={field.key}>{field.label}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {eyes.map((eye) => (
                <TableRow key={eye.key}>
                  <TableCell className={cn("font-semibold", eye.color)}>
                    {eye.key}
                  </TableCell>
                  {VISION_EXAM_FIELDS.map((field) => (
                    <TableCell key={`${eye.key}-${field.key}`}>
                      <Input
                        value={getVisionExamFieldValue(
                          value,
                          eye.key,
                          field.key,
                        )}
                        onChange={(e) =>
                          handleChange(eye.key, field.key, e.target.value)
                        }
                        placeholder={field.placeholder}
                        className="h-8 w-24"
                        readOnly={readOnly}
                      />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label>PD (Pupillary Distance)</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                placeholder="Pupillary distance"
                value={value?.refraction?.pupillaryDistance?.toString() || ""}
                onChange={(e) =>
                  onChange({
                    ...value,
                    refraction: {
                      ...value.refraction,
                      pupillaryDistance: e.target.value
                        ? parseFloat(e.target.value)
                        : undefined,
                    },
                  })
                }
                readOnly={readOnly}
              />
              <Input
                value={value?.refraction?.notes || ""}
                placeholder="Notes"
                onChange={(e) =>
                  onChange({
                    ...value,
                    refraction: { ...value.refraction, notes: e.target.value },
                  })
                }
                readOnly={readOnly}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>IOP (Intraocular Pressure)</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative w-full">
                <span className="absolute left-3 top-2 text-xs font-bold text-info">
                  OD
                </span>
                <Input
                  className="pl-8"
                  placeholder="IOP"
                  value={value?.iop?.od?.toString() || ""}
                  onChange={(e) =>
                    onChange({
                      ...value,
                      iop: {
                        ...value.iop,
                        od: e.target.value
                          ? parseFloat(e.target.value)
                          : undefined,
                      },
                    })
                  }
                  readOnly={readOnly}
                />
              </div>
              <div className="relative w-full">
                <span className="absolute left-3 top-2 text-xs font-bold text-success">
                  OS
                </span>
                <Input
                  className="pl-8"
                  placeholder="IOP"
                  value={value?.iop?.os?.toString() || ""}
                  onChange={(e) =>
                    onChange({
                      ...value,
                      iop: {
                        ...value.iop,
                        os: e.target.value
                          ? parseFloat(e.target.value)
                          : undefined,
                      },
                    })
                  }
                  readOnly={readOnly}
                />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
