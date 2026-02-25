"use client";

import React, { FC, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { useDoctors } from "@/hooks/api/use-settings";
import { useConstants } from "@/features/_shared/hooks/use-constants";

interface ModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const AdmissionModal: FC<ModalProps> = ({ open, onOpenChange }) => {
  const [data, setData] = useState({
    ward: "",
    bed: "",
    doctor: "",
    diagnosis: "",
  });
  const { data: constants } = useConstants();
  const { data: doctors = [] } = useDoctors();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-lg m-4">
        <CardHeader>
          <CardTitle>Admit Patient</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Ward</label>
              <select
                className="w-full p-2 mt-1 rounded border bg-background"
                value={data.ward}
                onChange={(e) => setData({ ...data, ward: e.target.value })}
              >
                <option value="">Select Ward</option>
                {constants?.wardTypes?.map(
                  (ward: { value: string; label: string }) => (
                    <option key={ward.value} value={ward.value}>
                      {ward.label}
                    </option>
                  ),
                )}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Bed</label>
              <select
                className="w-full p-2 mt-1 rounded border bg-background"
                value={data.bed}
                onChange={(e) => setData({ ...data, bed: e.target.value })}
              >
                <option value="">Select Bed</option>
                {constants?.availableBeds?.map(
                  (bed: { value: string; label: string }) => (
                    <option key={bed.value} value={bed.value}>
                      {bed.label}
                    </option>
                  ),
                )}
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Attending Doctor</label>
            <select
              className="w-full p-2 mt-1 rounded border bg-background"
              value={data.doctor}
              onChange={(e) => setData({ ...data, doctor: e.target.value })}
            >
              <option value="">Select Doctor</option>
              {doctors.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Admission Diagnosis</label>
            <textarea
              className="w-full p-2 mt-1 rounded border bg-background min-h-20"
              value={data.diagnosis}
              onChange={(e) => setData({ ...data, diagnosis: e.target.value })}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange?.(false)}>
              Cancel
            </Button>
            <Button onClick={() => onOpenChange?.(false)}>Admit</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
