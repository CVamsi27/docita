import { UseFormReturn } from "react-hook-form";
import { useLabs } from "@workspace/data-access";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/form/select";
import type { CreateLabTestOrderInput } from "@/features/lab-tests/hooks/use-lab-tests-logic";

const UNASSIGNED_VALUE = "__unassigned__";

interface OrderLabSelectFieldProps {
  form: UseFormReturn<CreateLabTestOrderInput>;
}

/**
 * Routes an order to a specific lab. Hidden when the clinic has no active labs
 * configured — those clinics run a single implicit in-house lab.
 */
export function OrderLabSelectField({ form }: OrderLabSelectFieldProps) {
  const { data: labs = [] } = useLabs();
  const activeLabs = labs.filter((lab) => lab.active);

  if (activeLabs.length === 0) return null;

  return (
    <FormField
      control={form.control}
      name="labId"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Lab</FormLabel>
          <Select
            value={field.value ?? UNASSIGNED_VALUE}
            onValueChange={(value) =>
              field.onChange(value === UNASSIGNED_VALUE ? undefined : value)
            }
          >
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder="Assign to a lab" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              <SelectItem value={UNASSIGNED_VALUE}>Unassigned</SelectItem>
              {activeLabs.map((lab) => (
                <SelectItem key={lab.id} value={lab.id}>
                  {lab.name}
                  {lab.type === "EXTERNAL" ? " (External)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
