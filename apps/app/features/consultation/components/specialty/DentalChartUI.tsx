import { Button } from '@workspace/ui/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card';
import { Label } from '@workspace/ui/components/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select';
import { cn } from '@workspace/ui/lib/utils';
import { useState } from 'react';

// FDI Notation
// Quadrants: 1=UR, 2=UL, 3=LL, 4=LR (Permanent)
// 5=UR, 6=UL, 7=LL, 8=LR (Primary - omitted for MVP but can be added)

const TEETH_QUADRANTS = {
  UR: [18, 17, 16, 15, 14, 13, 12, 11], // Upper Right
  UL: [21, 22, 23, 24, 25, 26, 27, 28], // Upper Left
  LL: [31, 32, 33, 34, 35, 36, 37, 38], // Lower Left
  LR: [48, 47, 46, 45, 44, 43, 42, 41], // Lower Right
};

const TOOTH_CONDITIONS = [
  { value: 'HEALTHY', label: 'Healthy', color: 'bg-white border-slate-200' },
  { value: 'CARIES', label: 'Caries', color: 'bg-red-100 border-red-300' },
  { value: 'FILLED', label: 'Filled', color: 'bg-blue-100 border-blue-300' },
  { value: 'MISSING', label: 'Missing', color: 'bg-slate-100 border-slate-200 opacity-50' },
  { value: 'CROWN', label: 'Crown', color: 'bg-yellow-100 border-yellow-300' },
  { value: 'ROOT_CANAL', label: 'Root Canal', color: 'bg-purple-100 border-purple-300' },
  { value: 'IMPLANT', label: 'Implant', color: 'bg-green-100 border-green-300' },
];

interface ToothData {
  condition: string;
  notes: string;
}

export type DentalChartValue = Record<number, ToothData>;

interface DentalChartUIProps {
  value: DentalChartValue;
  onChange: (value: DentalChartValue) => void;
  readOnly?: boolean;
}

export function DentalChartUI({ value, onChange, readOnly }: DentalChartUIProps) {
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
  
  // Helper to safely get tooth data
  const getToothData = (toothId: number) => {
    return value?.[toothId] || { condition: 'HEALTHY', notes: '' };
  };

  const handleToothClick = (toothId: number) => {
    if (readOnly) return;
    setSelectedTooth(toothId);
  };

  const updateToothCondition = (condition: string) => {
    if (selectedTooth === null) return;
    const newData = {
      ...value,
      [selectedTooth]: {
        ...getToothData(selectedTooth),
        condition,
      },
    };
    onChange(newData);
  };

  const updateToothNotes = (notes: string) => {
    if (selectedTooth === null) return;
    const newData = {
      ...value,
      [selectedTooth]: {
        ...getToothData(selectedTooth),
        notes,
      },
    };
    onChange(newData);
  };

  const renderTooth = (toothId: number) => {
    const data = getToothData(toothId);
    const condition = TOOTH_CONDITIONS.find((c) => c.value === data.condition) || TOOTH_CONDITIONS[0];
    const isSelected = selectedTooth === toothId;

    return (
      <button
        key={toothId}
        type="button"
        onClick={() => handleToothClick(toothId)}
        className={cn(
          'h-12 w-10 flex flex-col items-center justify-center border rounded-md text-xs font-medium transition-all',
          condition.color,
          isSelected ? 'ring-2 ring-primary ring-offset-2' : '',
          readOnly ? 'cursor-default' : 'cursor-pointer hover:shadow-sm'
        )}
        title={`Tooth ${toothId}: ${condition.label}`}
      >
        <span className="text-[10px] text-slate-500">{toothId}</span>
        <div className={`w-3 h-3 rounded-full mt-1 ${getConditionColor(condition.value)}`} />
      </button>
    );
  };

  const getConditionColor = (code: string) => {
    switch (code) {
      case 'CARIES': return 'bg-red-500';
      case 'FILLED': return 'bg-blue-500';
      case 'CROWN': return 'bg-yellow-500';
      case 'ROOT_CANAL': return 'bg-purple-500';
      case 'IMPLANT': return 'bg-green-500';
      case 'MISSING': return 'bg-slate-400';
      default: return 'bg-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 items-center p-6 bg-slate-50 rounded-xl border border-slate-100">
        {/* Upper Arch */}
        <div className="flex gap-8">
          <div className="flex gap-1">{TEETH_QUADRANTS.UR.map(renderTooth)}</div>
          <div className="flex gap-1">{TEETH_QUADRANTS.UL.map(renderTooth)}</div>
        </div>
        
        {/* Divider */}
        <div className="w-full h-px bg-slate-200 relative">
          <span className="absolute left-1/2 -translate-x-1/2 -top-2.5 bg-slate-50 px-2 text-xs text-slate-400 font-medium tracking-widest">
            FDI CHART
          </span>
        </div>

        {/* Lower Arch */}
        <div className="flex gap-8">
          <div className="flex gap-1">{TEETH_QUADRANTS.LR.map(renderTooth)}</div>
          <div className="flex gap-1">{TEETH_QUADRANTS.LL.map(renderTooth)}</div>
        </div>
      </div>

      {/* Editor Panel */}
      {!readOnly && selectedTooth && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              Tooth {selectedTooth}
              <span className="text-sm font-normal text-muted-foreground">
                ({getToothData(selectedTooth).condition})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {TOOTH_CONDITIONS.map((cond) => (
                <Button
                  key={cond.value}
                  type="button"
                  variant={getToothData(selectedTooth).condition === cond.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => updateToothCondition(cond.value)}
                  className="w-full justify-start"
                >
                  <div className={`w-2 h-2 rounded-full mr-2 ${getConditionColor(cond.value)}`} />
                  {cond.label}
                </Button>
              ))}
            </div>
            
            <div className="space-y-2">
              <Label>Notes</Label>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Specific notes for this tooth..."
                value={getToothData(selectedTooth).notes}
                onChange={(e) => updateToothNotes(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
