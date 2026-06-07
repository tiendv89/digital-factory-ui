import { fetchEventSource } from "@microsoft/fetch-event-source";

export type HermesEvent =
  | { type: "delta"; text: string }
  | { type: "tool_start"; name: string; callId: string }
  | { type: "tool_result"; name: string; callId: string; output: unknown }
  | { type: "artifact_saved"; artifact: "product_spec" | "technical_design" }
  | { type: "usage"; inputTokens: number; outputTokens: number; cachedTokens: number }
  | { type: "error"; message: string }
  | { type: "done" };

function getApiBase(): string {
  return process.env.NEXT_PUBLIC_WORKFLOW_API_URL ?? "https://workflow-backend-api.kitelabs.io";
}

export async function createChatSession(
  workspaceId: string,
  featureId: string,
): Promise<{ session_id: string }> {
  const res = await fetch(
    `${getApiBase()}/api/workspaces/${workspaceId}/features/${featureId}/chat/session`,
    {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({}),
    },
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`createChatSession failed (${res.status}): ${text}`);
  }

  const body = await res.json() as { session_id: string };
  return body;
}

export type StreamChatTurnParams = {
  workspaceId: string;
  featureId: string;
  sessionId: string;
  message: string;
};

export function streamChatTurn(
  params: StreamChatTurnParams,
  onEvent: (event: HermesEvent) => void,
  onDone: () => void,
  onError: (err: Error) => void,
): AbortController {
  const ctrl = new AbortController();

  fetchEventSource(
    `${getApiBase()}/api/workspaces/${params.workspaceId}/features/${params.featureId}/chat`,
    {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: params.sessionId,
        message: params.message,
      }),
      signal: ctrl.signal,
      openWhenHidden: true,
      onmessage(ev) {
        if (ev.data === "[DONE]") {
          onEvent({ type: "done" });
          onDone();
          return;
        }
        try {
          const raw = JSON.parse(ev.data) as Record<string, unknown>;
          const hermesEvent = parseHermesEvent(ev.event, raw);
          if (hermesEvent) onEvent(hermesEvent);
        } catch {
          // skip unparseable frames
        }
      },
      onerror(err) {
        onError(err instanceof Error ? err : new Error(String(err)));
        throw err; // prevent fetchEventSource auto-retry
      },
      onclose() {
        onDone();
      },
    },
  ).catch((err) => {
    if ((err as Error)?.name !== "AbortError") {
      onError(err instanceof Error ? err : new Error(String(err)));
    }
  });

  return ctrl;
}

function parseHermesEvent(
  eventType: string | undefined,
  raw: Record<string, unknown>,
): HermesEvent | null {
  const type = (raw.type as string) || eventType || "message";

  if (type === "message_output_partial") {
    return { type: "delta", text: String(raw.content ?? "") };
  }
  if (type === "tool_call_item") {
    return {
      type: "tool_start",
      name: String(raw.name ?? ""),
      callId: String(raw.call_id ?? ""),
    };
  }
  if (type === "function_call_output") {
    return {
      type: "tool_result",
      name: String(raw.name ?? ""),
      callId: String(raw.call_id ?? ""),
      output: raw.output,
    };
  }
  if (type === "artifact_saved") {
    return {
      type: "artifact_saved",
      artifact: raw.artifact as "product_spec" | "technical_design",
    };
  }
  if (type === "usage") {
    return {
      type: "usage",
      inputTokens: Number(raw.input ?? 0),
      outputTokens: Number(raw.output ?? 0),
      cachedTokens: Number(raw.cached ?? 0),
    };
  }
  if (type === "error") {
    return { type: "error", message: String(raw.message ?? "Unknown error") };
  }
  return null;
}
