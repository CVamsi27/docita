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

import { OphthalmologyExamData } from "@workspace/types";

interface VisionExamProps {
  value: OphthalmologyExamData;
  onChange: (value: OphthalmologyExamData) => void;
  readOnly?: boolean;
}

export function VisionExamUI({ value, onChange, readOnly }: VisionExamProps) {
  const handleChange = (
    eye: "OD" | "OS",
    field: string, 
    val: string,
  ) => {
    if (readOnly) return;
    const eyeKey = eye === "OD" ? "od" : "os";

    const newData = { ...value };

    if (["sph", "cyl", "axis", "add"].includes(field)) {
      newData.refraction = { ...newData.refraction };
      newData.refraction[eyeKey] = { ...newData.refraction?.[eyeKey] };

      const refParams = newData.refraction[eyeKey]!;
      if (field === "sph") refParams.sphere = val ? parseFloat(val) : undefined;
      if (field === "cyl")
        refParams.cylinder = val ? parseFloat(val) : undefined;
      if (field === "axis") refParams.axis = val ? parseFloat(val) : undefined;
      if (field === "add") refParams.add = val ? parseFloat(val) : undefined;
    }

    if (["va", "vaNear"].includes(field)) {
      newData.visualAcuity = { ...newData.visualAcuity };
      newData.visualAcuity[eyeKey] = { ...newData.visualAcuity?.[eyeKey] };

      const vaParams = newData.visualAcuity[eyeKey]!;
      if (field === "va") vaParams.uncorrected = val;
      if (field === "vaNear") vaParams.corrected = val;
    }

    onChange(newData);
  };

  const eyes = [
    { key: "OD", label: "OD (Right Eye)", color: "text-info" },
    { key: "OS", label: "OS (Left Eye)", color: "text-success" },
  ] as const;

  const fields: Array<{
    key: string;
    label: string;
    placeholder: string;
  }> = [
    { key: "sph", label: "Sphere (Sph)", placeholder: "Sphere" },
    { key: "cyl", label: "Cylinder (Cyl)", placeholder: "Cylinder" },
    { key: "axis", label: "Axis", placeholder: "Axis" },
    { key: "add", label: "Add", placeholder: "Add" },
    { key: "va", label: "VA (Dist)", placeholder: "Visual acuity" },
    { key: "vaNear", label: "VA (Near)", placeholder: "Near visual acuity" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Refraction & Visual Acuity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Eye</TableHead>
                {fields.map((field) => (
                  <TableHead key={field.key}>{field.label}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {eyes.map((eye) => (
                <TableRow key={eye.key}>
                  <TableCell className={`font-semibold ${eye.color}`}>
                    {eye.key}
                  </TableCell>
                  {fields.map((field) => (
                    <TableCell key={`${eye.key}-${field.key}`}>
                      <Input
                        value={(() => {
                          const eyeKey = eye.key === "OD" ? "od" : "os";
                          if (field.key === "sph")
                            return (
                              value.refraction?.[eyeKey]?.sphere?.toString() ||
                              ""
                            );
                          if (field.key === "cyl")
                            return (
                              value.refraction?.[
                                eyeKey
                              ]?.cylinder?.toString() || ""
                            );
                          if (field.key === "axis")
                            return (
                              value.refraction?.[eyeKey]?.axis?.toString() || ""
                            );
                          if (field.key === "add")
                            return (
                              value.refraction?.[eyeKey]?.add?.toString() || ""
                            );
                          if (field.key === "va")
                            return (
                              value.visualAcuity?.[eyeKey]?.uncorrected || ""
                            );
                          if (field.key === "vaNear")
                            return (
                              value.visualAcuity?.[eyeKey]?.corrected || ""
                            );
                          return "";
                        })()}
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

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>PD (Pupillary Distance)</Label>
            <div className="flex gap-2">
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
            <div className="flex gap-2">
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
