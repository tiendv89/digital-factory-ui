import { fetchEventSource } from "@microsoft/fetch-event-source";

import type { CtaSuggestion, HermesMessage, MessageAuthor, ThreadMember, ToolCallEntry } from "@/components/agent-chat/types";
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
  | { type: "reasoning"; content: string }
  | { type: "tool_start"; name: string; callId: string }
  | { type: "tool_result"; name: string; callId: string; output: unknown }
  | { type: "artifact_saved"; artifact: "product_spec" | "technical_design" | "tasks" }
  | { type: "usage"; inputTokens: number; outputTokens: number; cachedTokens: number }
  | { type: "error"; message: string }
  | { type: "done" };

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

  // The backend stores a turn's assistant output as multiple rows (one per
  // model iteration: text → tool_calls → text). The live stream renders all of
  // it as a single coalesced bubble, so coalesce consecutive assistant rows
  // here too — concatenate their content and merge their tool calls — to keep
  // the reloaded transcript identical to what was streamed live.
  const rows = (body.messages ?? []).filter((m) => m.role === "user" || m.role === "assistant");
  const out: HermesMessage[] = [];
  let pending: HermesMessage | null = null;

  const flush = () => {
    if (pending) {
      out.push(pending);
      pending = null;
    }
  };

  for (const m of rows) {
    if (m.role === "user") {
      flush();
      const message: HermesMessage = { id: m.id, role: "user", content: m.content ?? "" };
      if (m.author) {
        message.author = {
          id: m.author.id,
          name: m.author.name,
          avatarUrl: m.author.avatarUrl ?? null,
          roleLabel: m.author.roleLabel ?? null,
        };
      }
      out.push(message);
      continue;
    }

    // assistant — merge into the current turn's bubble.
    const toolCalls = parseToolCalls(m.tool_calls);
    if (!pending) {
      pending = { id: m.id, role: "assistant", content: m.content ?? "" };
      if (toolCalls.length > 0) pending.toolCalls = toolCalls;
    } else {
      pending.content += m.content ?? "";
      if (toolCalls.length > 0) {
        pending.toolCalls = [...(pending.toolCalls ?? []), ...toolCalls];
      }
    }
  }
  flush();
  return out;
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

/** Hard-delete a single session and its messages. */
export async function deleteSession(sessionId: string): Promise<void> {
  const res = await fetch(`${getApiBase()}/api/v1/sessions/${sessionId}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`deleteSession failed (${res.status}): ${text}`);
  }
}

/** Hard-delete all of the caller's sessions for a workspace+feature. */
export async function deleteAllSessions(workspaceId: string, featureId: string): Promise<number> {
  const qs = new URLSearchParams({ workspace_id: workspaceId, feature_id: featureId }).toString();
  const res = await fetch(`${getApiBase()}/api/v1/sessions?${qs}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`deleteAllSessions failed (${res.status}): ${text}`);
  }
  const body = (await res.json().catch(() => ({ deleted: 0 }))) as { deleted: number };
  return body.deleted ?? 0;
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
      } catch {}
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
  if (eventType === "agent.reasoning") {
    const content = typeof raw.content === "string" ? raw.content : "";
    return content ? [{ type: "reasoning", content }] : [];
  }

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

  if (eventType === "hermes.artifact.saved") {
    return [
      {
        type: "artifact_saved",
        artifact: raw.artifact as "product_spec" | "technical_design" | "tasks",
      },
    ];
  }

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

export type ThreadEvent =
  | { type: "message.created"; message: HermesMessage }
  | { type: "delta"; messageId: string; text: string }
  | { type: "reasoning"; messageId: string; content: string }
  | { type: "tool_start"; messageId: string; callId: string; name: string }
  | { type: "tool_result"; messageId: string; callId: string; name: string; output: unknown }
  | { type: "artifact_saved"; artifact: "product_spec" | "technical_design" | "tasks" }
  | { type: "turn.cta_suggestions"; messageId: string; suggestions: CtaSuggestion[] }
  | { type: "agent.working"; sessionId: string }
  | { type: "turn.stopped"; messageId: string | null }
  | { type: "usage"; messageId: string; inputTokens: number; outputTokens: number; cachedTokens: number }
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
  author_id?: string | null;
  tool_calls?: unknown;
  cta_suggestions?: unknown;
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
    authorId: m.author_id ?? author?.id,
    createdAt: m.created_at,
  };
  const toolCalls = parseToolCalls(m.tool_calls);
  if (toolCalls.length > 0) msg.toolCalls = toolCalls;
  if (Array.isArray(m.cta_suggestions) && m.cta_suggestions.length > 0) {
    msg.ctaSuggestions = m.cta_suggestions as CtaSuggestion[];
    msg.ctaActive = false; // history messages are inert
  }
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
export async function sendThreadMessage(threadId: string, content: string): Promise<{ message_id: string; agent_triggered: boolean }> {
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
  const body = (await res.json()) as { message_id: string; agent_triggered?: boolean };
  return { message_id: body.message_id, agent_triggered: body.agent_triggered ?? false };
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
      } catch {}
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
  if (eventType === "agent.reasoning") {
    const content = typeof raw.content === "string" ? raw.content : "";
    return content ? [{ type: "reasoning", messageId: String(raw.message_id ?? ""), content }] : [];
  }

  if (eventType === "message.created") {
    const msg = raw.message as RawThreadMessage | undefined;
    if (!msg) return [];
    return [{ type: "message.created", message: rawMessageToHermesMessage(msg) }];
  }

  if (eventType === "agent.working") {
    return [{ type: "agent.working", sessionId: String(raw.session_id ?? "") }];
  }

  if (eventType === "agent.delta") {
    const content = typeof raw.content === "string" ? raw.content : "";
    return content ? [{ type: "delta", messageId: String(raw.message_id ?? ""), text: content }] : [];
  }

  if (eventType === "turn.cta_suggestions") {
    const suggestions = Array.isArray(raw.suggestions) ? (raw.suggestions as CtaSuggestion[]) : [];
    return [{ type: "turn.cta_suggestions", messageId: String(raw.message_id ?? ""), suggestions }];
  }

  if (eventType === "agent.done") {
    return [{ type: "done" }];
  }

  if (eventType === "agent.usage") {
    return [
      {
        type: "usage",
        messageId: String(raw.message_id ?? ""),
        inputTokens: Number(raw.input_tokens ?? 0),
        outputTokens: Number(raw.output_tokens ?? 0),
        cachedTokens: Number(raw.cached_tokens ?? 0),
      },
    ];
  }

  if (eventType === "turn.stopped") {
    const messageId = typeof raw.message_id === "string" ? raw.message_id : null;
    return [{ type: "turn.stopped", messageId }];
  }

  if (eventType === "agent.error") {
    return [{ type: "error", message: String(raw.error ?? raw.message ?? "Agent error") }];
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

  const legacyEvents = parseHermesEvents(eventType, raw);
  return legacyEvents.flatMap((e): ThreadEvent[] => {
    if (e.type === "delta") {
      return [{ type: "delta", messageId: String(raw.message_id ?? ""), text: e.text }];
    }
    if (e.type === "reasoning") {
      return [{ type: "reasoning", messageId: String(raw.message_id ?? ""), content: e.content }];
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
    if (e.type === "usage") {
      return [{ type: "usage", messageId: String(raw.message_id ?? ""), inputTokens: e.inputTokens, outputTokens: e.outputTokens, cachedTokens: e.cachedTokens }];
    }
    if (e.type === "error") {
      return [{ type: "error", message: e.message }];
    }
    return [];
  });
}

type RawThreadMember = {
  id: string;
  name: string;
  handle?: string | null;
  avatar_url?: string | null;
  avatarUrl?: string | null;
  role_label?: string | null;
  roleLabel?: string | null;
};

/**
 * Fetch the member list for a thread.  The `@agent` sentinel is always
 * prepended so it appears first in the typeahead.
 */
export async function getThreadMembers(threadId: string): Promise<ThreadMember[]> {
  const res = await fetch(`${getApiBase()}/api/v1/threads/${encodeURIComponent(threadId)}/members`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error(`getThreadMembers failed (${res.status})`);
  const body = (await res.json()) as { members: RawThreadMember[] };
  const humans: ThreadMember[] = (body.members ?? []).map((m) => ({
    id: m.id,
    name: m.name,
    handle: m.handle ?? m.name.toLowerCase().replace(/\s+/g, ""),
    avatarUrl: m.avatar_url ?? m.avatarUrl ?? null,
    roleLabel: m.role_label ?? m.roleLabel ?? null,
    kind: "user" as const,
  }));
  return [{ id: "agent", name: "Hermes Agent", handle: "agent", kind: "agent" as const }, ...humans];
}

export type UnreadMentionCounts = {
  /** Workspace-level aggregate of unread mentions. */
  total: number;
  /** Per-thread/channel unread counts keyed by session id. */
  perSession: Record<string, number>;
};

/** Fetch per-thread and aggregate unread mention counts for the given workspace. */
export async function getUnreadMentions(workspaceId: string): Promise<UnreadMentionCounts> {
  const qs = new URLSearchParams({ workspace_id: workspaceId }).toString();
  const res = await fetch(`${getApiBase()}/api/v1/unread?${qs}`, { credentials: "include" });
  if (!res.ok) throw new Error(`getUnreadMentions failed (${res.status})`);
  return (await res.json()) as UnreadMentionCounts;
}

/**
 * Cancel an in-progress agent turn. Returns immediately (202 means cancel accepted).
 * A 404 means the turn already finished naturally — safe to ignore.
 */
export async function cancelAgentTurn(threadId: string): Promise<void> {
  await fetch(`${getApiBase()}/api/v1/threads/${encodeURIComponent(threadId)}/cancel`, {
    method: "POST",
    credentials: "include",
    keepalive: true,
  });
}

/**
 * Mark all unread mentions in a thread as read (called when the thread is opened).
 * Ignores 404/non-OK gracefully — the server may not have the endpoint yet.
 */
export async function markThreadRead(threadId: string): Promise<void> {
  try {
    await fetch(`${getApiBase()}/api/v1/threads/${encodeURIComponent(threadId)}/read`, {
      method: "POST",
      credentials: "include",
    });
  } catch {}
}

export type ChannelSummary = {
  id: string;
  name: string;
  description?: string | null;
  /** Channels are feature-scoped: the feature this channel belongs to. */
  feature_id?: string;
  creator_user_id?: string;
  started_at?: number;
  last_active_at?: number;
};

/** List channels for a workspace, optionally scoped to a feature (channels are feature-scoped). */
export async function listChannels(workspaceId: string, featureId?: string): Promise<ChannelSummary[]> {
  const params: Record<string, string> = { workspace_id: workspaceId };
  if (featureId !== undefined) params.feature_id = featureId;
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${getApiBase()}/api/v1/channels?${qs}`, { credentials: "include" });
  if (!res.ok) throw new Error(`listChannels failed (${res.status})`);
  const body = (await res.json()) as { channels: ChannelSummary[] };
  return body.channels ?? [];
}

/** Create a feature-scoped channel (open to any workspace member). Returns the new channel id. */
export async function createChannel(workspaceId: string, featureId: string, name: string, description?: string): Promise<string> {
  const res = await fetch(`${getApiBase()}/api/v1/channels`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ workspace_id: workspaceId, feature_id: featureId, name, ...(description ? { description } : {}) }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`createChannel failed (${res.status}): ${text}`);
  }
  const body = (await res.json()) as { channel_id: string };
  return body.channel_id;
}

/** Hard-delete a channel. Admin-only on the backend; returns 403 for non-admins. */
export async function deleteChannel(channelId: string): Promise<void> {
  const res = await fetch(`${getApiBase()}/api/v1/channels/${encodeURIComponent(channelId)}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`deleteChannel failed (${res.status}): ${text}`);
  }
}

/** Join a channel (adds calling user as a member). */
export async function joinChannel(channelId: string): Promise<void> {
  const res = await fetch(`${getApiBase()}/api/v1/channels/${encodeURIComponent(channelId)}/join`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`joinChannel failed (${res.status}): ${text}`);
  }
}
