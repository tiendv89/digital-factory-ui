import { fetchEventSource } from "@microsoft/fetch-event-source";

import type { HermesMessage, MessageAuthor, ToolCallEntry } from "@/components/agent-chat/types";
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
  author?: {
    id: string;
    name: string;
    avatarUrl?: string | null;
    roleLabel?: string | null;
  } | null;
};

/**
 * Fetch the full transcript for an existing session, oldest-first.
 *
 * The gateway returns user/assistant/tool rows; we render user and assistant
 * messages and attach any tool calls recorded on assistant turns (already
 * completed, so their status is "done"). The `author` field is populated when
 * the server returns it (post-T1 migration); legacy rows return `author: null`.
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
      if (m.author) {
        message.author = {
          id: m.author.id,
          name: m.author.name,
          avatarUrl: m.author.avatarUrl ?? null,
          roleLabel: m.author.roleLabel ?? null,
        };
      }
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

// ─── Persistent subscription transport (T6) ────────────────────────────────

export type ThreadEvent =
  | { type: "message.created"; message: HermesMessage }
  | { type: "delta"; messageId: string; text: string }
  | { type: "tool_start"; messageId: string; callId: string; name: string }
  | { type: "tool_result"; messageId: string; callId: string; name: string; output: unknown }
  | { type: "artifact_saved"; artifact: "product_spec" | "technical_design" }
  | { type: "agent.working"; sessionId: string }
  | { type: "typing"; userId: string }
  | { type: "member.changed" }
  | { type: "channel.deleted" }
  | { type: "error"; message: string }
  | { type: "done" };

type RawThreadMessage = {
  id: string;
  role: string;
  content: string;
  created_at?: number;
  tool_calls?: unknown;
  author?: {
    id: string;
    name: string;
    avatarUrl?: string | null;
    roleLabel?: string | null;
  } | null;
};

function rawMessageToHermesMessage(m: RawThreadMessage): HermesMessage {
  const author: MessageAuthor | undefined = m.author
    ? {
        id: m.author.id,
        name: m.author.name,
        avatarUrl: m.author.avatarUrl ?? null,
        roleLabel: m.author.roleLabel ?? null,
      }
    : undefined;
  const msg: HermesMessage = {
    id: m.id,
    role: m.role as HermesMessage["role"],
    content: m.content ?? "",
    author,
  };
  const toolCalls = parseToolCalls(m.tool_calls);
  if (toolCalls.length > 0) msg.toolCalls = toolCalls;
  return msg;
}

/**
 * Fetch the history for a thread, optionally replaying from a cursor.
 * Used on (re)connect with `?since=` to avoid missing events that arrived
 * while the subscription was down.
 */
export async function getThreadMessages(threadId: string, since?: string): Promise<HermesMessage[]> {
  const qs = since ? `?since=${encodeURIComponent(since)}` : "";
  const res = await fetch(`${getApiBase()}/api/v1/threads/${encodeURIComponent(threadId)}/messages${qs}`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error(`getThreadMessages failed (${res.status})`);
  const body = (await res.json()) as { messages: RawThreadMessage[] };
  return (body.messages ?? []).filter((m) => m.role === "user" || m.role === "assistant").map(rawMessageToHermesMessage);
}

/**
 * Send a human message to the thread. Returns quickly (202); the actual
 * message and any triggered agent response arrive on the subscription stream.
 */
export async function sendThreadMessage(threadId: string, content: string): Promise<{ message_id: string }> {
  const res = await fetch(`${getApiBase()}/api/v1/threads/${encodeURIComponent(threadId)}/messages`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`sendThreadMessage failed (${res.status}): ${text}`);
  }
  return (await res.json()) as { message_id: string };
}

/**
 * Open a persistent SSE subscription to `GET .../threads/{id}/stream`.
 * All thread events — human messages, agent deltas, tool progress, activity
 * indicators — are delivered here to every viewer.
 *
 * Pass `since` on reconnect to replay missed events via `?since=<cursor>`.
 * Returns an AbortController; call `.abort()` to close the subscription.
 */
export function subscribeToThread(threadId: string, since: string | null, onEvent: (event: ThreadEvent) => void, onDone: () => void, onError: (err: Error) => void): AbortController {
  const ctrl = new AbortController();
  const sinceQs = since ? `?since=${encodeURIComponent(since)}` : "";
  let errorReported = false;

  fetchEventSource(`${getApiBase()}/api/v1/threads/${encodeURIComponent(threadId)}/stream${sinceQs}`, {
    method: "GET",
    credentials: "include",
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
        for (const event of parseThreadEvents(ev.event, raw)) {
          onEvent(event);
        }
      } catch {
        // skip unparseable frames
      }
    },
    onerror(err) {
      errorReported = true;
      onError(err instanceof Error ? err : new Error(String(err)));
      throw err; // prevent fetchEventSource auto-retry
    },
    onclose() {
      onDone();
    },
  }).catch((err) => {
    if (!errorReported && (err as Error)?.name !== "AbortError") {
      onError(err instanceof Error ? err : new Error(String(err)));
    }
  });

  return ctrl;
}

function parseThreadEvents(eventType: string | undefined, raw: Record<string, unknown>): ThreadEvent[] {
  // New thread-level event types from hermes-agent T3
  if (eventType === "message.created") {
    const msg = raw.message as RawThreadMessage | undefined;
    if (!msg) return [];
    return [{ type: "message.created", message: rawMessageToHermesMessage(msg) }];
  }

  if (eventType === "agent.working") {
    return [{ type: "agent.working", sessionId: String(raw.session_id ?? "") }];
  }

  if (eventType === "typing") {
    return [{ type: "typing", userId: String(raw.user_id ?? "") }];
  }

  if (eventType === "member.changed") {
    return [{ type: "member.changed" }];
  }

  if (eventType === "channel.deleted") {
    return [{ type: "channel.deleted" }];
  }

  // Reuse existing hermes event parsing for agent output frames
  const legacyEvents = parseHermesEvents(eventType, raw);
  return legacyEvents.flatMap((e): ThreadEvent[] => {
    if (e.type === "delta") {
      return [{ type: "delta", messageId: String(raw.message_id ?? ""), text: e.text }];
    }
    if (e.type === "tool_start") {
      return [{ type: "tool_start", messageId: String(raw.message_id ?? ""), callId: e.callId, name: e.name }];
    }
    if (e.type === "tool_result") {
      return [{ type: "tool_result", messageId: String(raw.message_id ?? ""), callId: e.callId, name: e.name, output: e.output }];
    }
    if (e.type === "artifact_saved") {
      return [{ type: "artifact_saved", artifact: e.artifact }];
    }
    if (e.type === "error") {
      return [{ type: "error", message: e.message }];
    }
    // "usage" and any unknown legacy event types are not applicable in
    // the thread event model — skip silently rather than emitting a spurious done.
    return [];
  });
}
