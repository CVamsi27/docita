import { isRecord } from "@workspace/utils";

export function socketErrorData(
  err: unknown,
): { content?: { message?: string } } | undefined {
  if (!isRecord(err) || !isRecord(err.data)) return undefined;
  const data = err.data;
  if (!isRecord(data.content)) return { content: undefined };
  const content = data.content;
  return {
    content: {
      message:
        typeof content.message === "string" ? content.message : undefined,
    },
  };
}
