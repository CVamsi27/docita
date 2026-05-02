"use client";

import { FC } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Textarea } from "@workspace/ui/components/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";

export const ipdAdmissionFormSchema = z.object({
  patientId: z.string().min(1, "Select a patient"),
  wardId: z.string().min(1, "Select a ward"),
  bedId: z.string().min(1, "Select a bed"),
  attendingDoctorId: z.string().min(1, "Select the attending doctor"),
  diagnosis: z
    .string()
    .trim()
    .min(1, "Enter the admission diagnosis"),
  notes: z.string().optional(),
});

export type AdmissionFormData = z.infer<typeof ipdAdmissionFormSchema>;

export interface AdmissionFormProps {
  defaultValues?: Partial<AdmissionFormData>;
  onSubmit?: (data: AdmissionFormData) => void;
  isSubmitting?: boolean;
}

const WARD_OPTIONS = [
  { value: "general", label: "General Ward" },
  { value: "icu", label: "ICU" },
  { value: "private", label: "Private Room" },
];

const BED_OPTIONS = [
  { value: "bed-1", label: "Bed 101" },
  { value: "bed-2", label: "Bed 102" },
  { value: "bed-3", label: "Bed 103" },
];

const DOCTOR_OPTIONS = [
  { value: "dr1", label: "Dr. Vamsi Krishna" },
  { value: "dr2", label: "Dr. Priya Sharma" },
];

export const AdmissionForm: FC<AdmissionFormProps> = ({
  defaultValues,
  onSubmit,
  isSubmitting,
}) => {
  const form = useForm<AdmissionFormData>({
    resolver: zodResolver(ipdAdmissionFormSchema),
    defaultValues: {
      patientId: defaultValues?.patientId ?? "",
      wardId: defaultValues?.wardId ?? "",
      bedId: defaultValues?.bedId ?? "",
      attendingDoctorId: defaultValues?.attendingDoctorId ?? "",
      diagnosis: defaultValues?.diagnosis ?? "",
      notes: defaultValues?.notes ?? "",
    },
    mode: "onTouched",
  });

  const handleSubmit = form.handleSubmit((values) => {
    onSubmit?.(values);
  });

  return (
    <Card className="border-none shadow-lg">
      <CardHeader>
        <CardTitle>New Admission</CardTitle>
        <CardDescription>Admit a patient to the hospital</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <FormField
              control={form.control}
              name="patientId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Patient</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter patient name or phone"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="wardId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ward</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger
                          className="w-full"
                          aria-label="Select Ward"
                        >
                          <SelectValue placeholder="Ward" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {WARD_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bedId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bed</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger
                          className="w-full"
                          aria-label="Select Bed"
                        >
                          <SelectValue placeholder="Bed" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {BED_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="attendingDoctorId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Attending Doctor</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger
                        className="w-full"
                        aria-label="Select Doctor"
                      >
                        <SelectValue placeholder="Doctor" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {DOCTOR_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="diagnosis"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Admission Diagnosis</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Admission diagnosis"
                      className="min-h-20"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Admission notes"
                      className="min-h-[60px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting || form.formState.isSubmitting}
            >
              {isSubmitting || form.formState.isSubmitting
                ? "Admitting…"
                : "Admit Patient"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};
