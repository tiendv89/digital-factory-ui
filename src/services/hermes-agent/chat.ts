import { fetchEventSource } from "@microsoft/fetch-event-source";

import type { HermesMessage, ToolCallEntry } from "@/components/agent-chat/types";
import { getBffBaseUrl } from "@/constants/axios";

export type ChatSessionSummary = {
  id: string;
  title: string;
  started_at: number;
  last_active_at: number;
  last_message_excerpt: string;
  /** Last model used in the session, so reopening restores the selection. */
  model?: string | null;
};

export type ModelOption = {
  id: string;
  label: string;
  provider: string;
};

/** Fetch the catalog of selectable chat models and the server default. */
export async function listModels(): Promise<{ models: ModelOption[]; default: string }> {
  const res = await fetch(`${getApiBase()}/api/v1/models`, { credentials: "include" });
  if (!res.ok) throw new Error(`listModels failed (${res.status})`);
  return (await res.json()) as { models: ModelOption[]; default: string };
}

export type HermesEvent =
  | { type: "delta"; text: string }
  | { type: "tool_start"; name: string; callId: string }
  | { type: "tool_result"; name: string; callId: string; output: unknown }
  | { type: "artifact_saved"; artifact: "product_spec" | "technical_design" }
  | { type: "usage"; inputTokens: number; outputTokens: number; cachedTokens: number }
  | { type: "error"; message: string }
  | { type: "done" };

// The app talks to hermes-agent's workflow_gateway (routes under /api/v1)
// through the BFF, which injects the trusted caller identity (X-User-Id) behind
// the shared service token. The browser never sends user_id itself.
function getApiBase(): string {
  return `${getBffBaseUrl()}/bff/hermes-agent`;
}

export async function listChatSessions(workspaceId: string, featureId: string): Promise<ChatSessionSummary[]> {
  const qs = new URLSearchParams({ workspace_id: workspaceId, feature_id: featureId }).toString();
  const res = await fetch(`${getApiBase()}/api/v1/sessions?${qs}`, { credentials: "include" });
  if (!res.ok) throw new Error(`listChatSessions failed (${res.status})`);
  const body = (await res.json()) as { sessions: ChatSessionSummary[] };
  return body.sessions;
}

type RawSessionMessage = {
  id: string;
  role: string;
  content: string;
  created_at?: number;
  tool_name?: string;
  tool_call_id?: string;
  tool_calls?: unknown;
};

/**
 * Fetch the full transcript for an existing session, oldest-first.
 *
 * The gateway returns user/assistant/tool rows; we render user and assistant
 * messages and attach any tool calls recorded on assistant turns (already
 * completed, so their status is "done").
 */
export async function getSessionMessages(_workspaceId: string, _featureId: string, sessionId: string): Promise<HermesMessage[]> {
  const res = await fetch(`${getApiBase()}/api/v1/sessions/${sessionId}/messages`, { credentials: "include" });
  if (!res.ok) throw new Error(`getSessionMessages failed (${res.status})`);
  const body = (await res.json()) as { messages: RawSessionMessage[] };
  return (body.messages ?? [])
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => {
      const message: HermesMessage = {
        id: m.id,
        role: m.role as HermesMessage["role"],
        content: m.content ?? "",
      };
      const toolCalls = parseToolCalls(m.tool_calls);
      if (toolCalls.length > 0) message.toolCalls = toolCalls;
      return message;
    });
}

function parseToolCalls(raw: unknown): ToolCallEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((tc, i) => {
    const obj = (tc ?? {}) as Record<string, unknown>;
    const fn = (obj.function ?? {}) as Record<string, unknown>;
    return {
      callId: String(obj.id ?? obj.call_id ?? `tool-${i}`),
      name: String(fn.name ?? obj.name ?? "tool"),
      status: "done" as const,
    };
  });
}

export async function createChatSession(workspaceId: string, featureId: string): Promise<{ session_id: string }> {
  const res = await fetch(`${getApiBase()}/api/v1/session`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ workspace_id: workspaceId, feature_id: featureId }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`createChatSession failed (${res.status}): ${text}`);
  }

  const body = (await res.json()) as { session_id: string };
  return body;
}

export type StreamChatTurnParams = {
  workspaceId: string;
  featureId: string;
  sessionId: string;
  message: string;
  /** Catalog model id; empty reuses the session's model, then the server default. */
  model?: string;
};

export function streamChatTurn(params: StreamChatTurnParams, onEvent: (event: HermesEvent) => void, onDone: () => void, onError: (err: Error) => void): AbortController {
  const ctrl = new AbortController();

  fetchEventSource(`${getApiBase()}/api/v1/chat`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      session_id: params.sessionId,
      message: params.message,
      workspace_id: params.workspaceId,
      feature_id: params.featureId,
      model: params.model ?? "",
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
        for (const hermesEvent of parseHermesEvents(ev.event, raw)) {
          onEvent(hermesEvent);
        }
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
  }).catch((err) => {
    if ((err as Error)?.name !== "AbortError") {
      onError(err instanceof Error ? err : new Error(String(err)));
    }
  });

  return ctrl;
}

type OpenAIChunk = {
  choices?: Array<{
    delta?: { content?: unknown; role?: unknown };
    finish_reason?: string | null;
  }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
  hermes?: { error?: unknown };
};

/**
 * Parse one hermes-native chat SSE frame into zero or more internal
 * HermesEvents.
 *
 * The wire format (see hermes-agent workflow_gateway/streaming/sse.py):
 *   - `event: hermes.tool.progress` → { tool, toolCallId, status }
 *   - `event: hermes.artifact.saved` → { artifact }
 *   - default `data:` frames are OpenAI chat.completion.chunk objects carrying
 *     delta.content (text), finish_reason (stop/error), and usage.
 */
function parseHermesEvents(eventType: string | undefined, raw: Record<string, unknown>): HermesEvent[] {
  // Tool lifecycle (custom hermes event channel).
  if (eventType === "hermes.tool.progress") {
    const status = String(raw.status ?? "");
    const name = String(raw.tool ?? "");
    const callId = String(raw.toolCallId ?? "");
    if (status === "running") {
      return [{ type: "tool_start", name, callId }];
    }
    if (status === "completed") {
      return [{ type: "tool_result", name, callId, output: raw.output }];
    }
    return [];
  }

  // Workflow-gateway artifact extension.
  if (eventType === "hermes.artifact.saved") {
    return [
      {
        type: "artifact_saved",
        artifact: raw.artifact as "product_spec" | "technical_design",
      },
    ];
  }

  // Default channel: an OpenAI chat.completion.chunk.
  const chunk = raw as OpenAIChunk;
  const choice = chunk.choices?.[0];
  const events: HermesEvent[] = [];

  const content = choice?.delta?.content;
  if (typeof content === "string" && content.length > 0) {
    events.push({ type: "delta", text: content });
  }

  if (choice?.finish_reason === "error") {
    events.push({
      type: "error",
      message: String(chunk.hermes?.error ?? "Agent error"),
    });
  }

  if (chunk.usage) {
    events.push({
      type: "usage",
      inputTokens: Number(chunk.usage.prompt_tokens ?? 0),
      outputTokens: Number(chunk.usage.completion_tokens ?? 0),
      cachedTokens: 0,
    });
  }

  return events;
}
