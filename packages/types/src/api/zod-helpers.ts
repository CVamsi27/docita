import { z } from "zod";
import { stripHtmlTags } from "./sanitization";

export function optionalStringStripHtml(max: number) {
  return z.string().max(max).optional().transform(stripHtmlTags);
}
