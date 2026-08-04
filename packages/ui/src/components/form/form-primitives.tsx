"use client";

/**
 * One-line import path for the form-field primitives used together
 * by every react-hook-form + Select / Input / Textarea field module.
 * Pulls the same names from the existing `form/form` re-export plus
 * `form/input`, `form/select`, and `form/textarea` so consumers can
 * keep the canonical names without paying the long import block.
 */
export {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./form";
export { Input } from "./input";
export {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";
export { Textarea } from "./textarea";
