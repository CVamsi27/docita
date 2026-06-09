import { fetchWithSession } from "@/lib/auth/fetch-with-session";
import { isRecord } from "@workspace/utils";
import type { AskAiScope } from "./ask-ai-context";

export interface AskAiHistoryItem {
  role: "user" | "assistant";
  content: string;
}

interface AskAiStreamArgs {
  prompt: string;
  history: AskAiHistoryItem[];
  scope: AskAiScope | null;
  signal: AbortSignal;
  onDelta: (text: string) => void;
}

/**
 * POSTs to /ai/ask and consumes the SSE response. Yields tokens via onDelta;
 * resolves on `done`, throws on `error` events or transport failures. Honors
 * the supplied AbortSignal so the caller can stop mid-stream.
 */
export async function streamAskAi({
  prompt,
  history,
  scope,
  signal,
  onDelta,
}: AskAiStreamArgs): Promise<void> {
  const response = await fetchWithSession("/ai/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
    body: JSON.stringify({ prompt, history, scope }),
    signal,
  });

  if (!response.ok || !response.body) {
    let detail = "";
    try {
      detail = await response.text();
    } catch {
      // ignore
    }
    throw new AskAiError(parseErrorMessage(response.status, detail));
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      if (signal.aborted) return;
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let separatorIndex: number;
      while ((separatorIndex = buffer.indexOf("\n\n")) !== -1) {
        const rawEvent = buffer.slice(0, separatorIndex);
        buffer = buffer.slice(separatorIndex + 2);
        const parsed = parseEvent(rawEvent);
        if (!parsed) continue;
        if (parsed.event === "delta" && typeof parsed.data?.text === "string") {
          onDelta(parsed.data.text);
        } else if (parsed.event === "error") {
          const message =
            typeof parsed.data?.message === "string"
              ? parsed.data.message
              : "The assistant ran into a problem.";
          throw new AskAiError(message);
        } else if (parsed.event === "done") {
          return;
        }
      }
    }
  } finally {
    reader.cancel().catch(() => {});
  }
}

export class AskAiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AskAiError";
  }
}

interface ParsedEvent {
  event: string;
  data: Record<string, unknown> | null;
}

function parseEvent(raw: string): ParsedEvent | null {
  const lines = raw.split("\n");
  let event = "message";
  const dataLines: string[] = [];
  for (const line of lines) {
    if (line.startsWith("event:")) {
      event = line.slice(6).trim();
    } else if (line.startsWith("data:")) {
      dataLines.push(line.slice(5).trim());
    }
  }
  if (dataLines.length === 0) return { event, data: null };
  const dataString = dataLines.join("\n");
  try {
    const parsed: unknown = JSON.parse(dataString);
    return { event, data: isRecord(parsed) ? parsed : null };
  } catch {
    return null;
  }
}

function parseErrorMessage(status: number, detail: string): string {
  if (status === 401) return "Please sign back in to use Ask AI.";
  if (status === 403) return "Ask AI is not available on your current plan.";
  if (status === 402) return "Your AI credit allotment for this billing period is used up. Upgrade or wait for the next cycle.";
  if (status === 429) return "Too many Ask AI requests—try again in a minute.";
  if (detail) {
    try {
      const parsed: unknown = JSON.parse(detail);
      if (isRecord(parsed) && typeof parsed.message === "string") {
        return parsed.message;
      }
    } catch {
      // detail wasn't JSON
    }
  }
  return "We couldn't reach the assistant. Please try again.";
}
