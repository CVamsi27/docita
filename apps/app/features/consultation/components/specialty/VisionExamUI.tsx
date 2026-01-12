import { Input } from '@workspace/ui/components/input';
import { Label } from '@workspace/ui/components/label';
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@workspace/ui/components/table';

interface EyeExamData {
  sph?: string;
  cyl?: string;
  axis?: string;
  add?: string;
  va?: string;
  vaNear?: string;
  [key: string]: string | undefined;
}

export interface VisionExamData {
  OD?: EyeExamData;
  OS?: EyeExamData;
  pd?: { distance?: string; near?: string };
  iop?: { od?: string; os?: string };
}

interface VisionExamProps {
  value: VisionExamData;
  onChange: (value: VisionExamData) => void;
  readOnly?: boolean;
}

export function VisionExamUI({ value, onChange, readOnly }: VisionExamProps) {
  const handleChange = (eye: 'OD' | 'OS', field: keyof EyeExamData, val: string) => {
    if (readOnly) return;
    const newData = {
      ...value,
      [eye]: {
        ...(value?.[eye] || {}),
        [field]: val,
      },
    };
    onChange(newData);
  };

  const eyes = [
    { key: 'OD', label: 'OD (Right Eye)', color: 'text-blue-600' },
    { key: 'OS', label: 'OS (Left Eye)', color: 'text-green-600' },
  ] as const;

  const fields: Array<{ key: keyof EyeExamData; label: string; placeholder: string }> = [
    { key: 'sph', label: 'Sphere (Sph)', placeholder: '+/- 0.00' },
    { key: 'cyl', label: 'Cylinder (Cyl)', placeholder: '- 0.00' },
    { key: 'axis', label: 'Axis', placeholder: '0-180°' },
    { key: 'add', label: 'Add', placeholder: '+ 0.00' },
    { key: 'va', label: 'VA (Dist)', placeholder: '20/20' },
    { key: 'vaNear', label: 'VA (Near)', placeholder: 'J1' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Refraction & Visual Acuity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
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
                        value={value?.[eye.key]?.[field.key] || ''}
                        onChange={(e) => handleChange(eye.key, field.key, e.target.value)}
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
                placeholder="Distance (mm)" 
                value={value?.pd?.distance || ''}
                onChange={(e) => onChange({ ...value, pd: { ...value?.pd, distance: e.target.value } })}
                readOnly={readOnly}
              />
              <Input 
                placeholder="Near (mm)" 
                value={value?.pd?.near || ''}
                onChange={(e) => onChange({ ...value, pd: { ...value?.pd, near: e.target.value } })}
                readOnly={readOnly}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>IOP (Intraocular Pressure)</Label>
            <div className="flex gap-2">
              <div className="relative w-full">
                 <span className="absolute left-3 top-2 text-xs font-bold text-blue-600">OD</span>
                 <Input 
                   className="pl-8" 
                   placeholder="mmHg"
                   value={value?.iop?.od || ''}
                   onChange={(e) => onChange({ ...value, iop: { ...value?.iop, od: e.target.value } })}
                   readOnly={readOnly}
                 />
              </div>
              <div className="relative w-full">
                 <span className="absolute left-3 top-2 text-xs font-bold text-green-600">OS</span>
                 <Input 
                   className="pl-8" 
                   placeholder="mmHg"
                   value={value?.iop?.os || ''}
                   onChange={(e) => onChange({ ...value, iop: { ...value?.iop, os: e.target.value } })}
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
