import type { z } from 'zod';

export function expectMatchesSchema<TSchema extends z.ZodTypeAny>(
  schema: TSchema,
  data: unknown,
): z.infer<TSchema> {
  const result = schema.safeParse(data);
  if (result.success) return result.data;

  const formatted = result.error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join('.') : '(root)';
      return `${path}: ${issue.message}`;
    })
    .slice(0, 25)
    .join('\n');

  throw new Error(`Contract validation failed:\n${formatted}`);
}
