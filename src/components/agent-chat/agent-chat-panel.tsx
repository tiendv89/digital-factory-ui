"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { ChatSessionSummary, ModelOption, ThreadEvent, UnreadMentionCounts } from "@/services/hermes-agent/chat";
import {
  cancelAgentTurn,
  createChatSession,
  deleteAllSessions,
  deleteSession,
  getSessionMessages,
  getThreadMessages,
  getUnreadMentions,
  listChatSessions,
  listModels,
  markThreadRead,
  sendThreadMessage,
  streamChatTurn,
  subscribeToThread,
} from "@/services/hermes-agent/chat";
import { fetchMe, fetchOrgMembers, getMeData, listWorkspaceMembers } from "@/services/user-service";
import { useLocalWorkspaceStore } from "@/stores/workspace";

import { type ChannelAuthor, ChannelMessageList } from "./channel-message-list";
import { Conversation } from "./conversation";
import { MessageThread } from "./message-thread";
import { PromptInput } from "./prompt-input";
import { SessionHistoryList } from "./session-history-list";
import { SlashCommandPicker } from "./slash-command-picker";
import type { ChatStatus, HermesMessage, ThreadMember, ToolCallEntry } from "./types";

/** Derive a human display name: prefer the set display name, else the email's
 * local part (e.g. "pentative@gmail.com" → "pentative"), else null. */
function displayNameOf(displayName?: string | null, email?: string | null): string | null {
  const name = displayName?.trim();
  if (name) return name;
  const local = email?.split("@")[0]?.trim();
  return local || null;
}

/** Derive an @mention handle. MUST match hermes `handle_for` so the @token the
 * user inserts resolves to a user_id on the backend. */
function deriveHandle(displayName?: string | null, email?: string | null): string {
  if (email) {
    const local = email
      .split("@")[0]
      .toLowerCase()
      .replace(/[^a-z0-9._-]/g, "");
    if (local) return local;
  }
  return (displayName ?? "").toLowerCase().replace(/[^a-z0-9._-]+/g, "");
}

/**
 * requestAnimationFrame never fires (or is throttled to near-zero) in a
 * background/unfocused browser tab. The delta/thinking flush queues are driven
 * by rAF purely to smooth the per-word animation, so a passive channel viewer
 * whose tab isn't focused would otherwise see nothing update until they
 * refocus, at which point the whole backlog renders in one jump. Fall back to
 * a timer while hidden so streamed content keeps landing regardless of focus.
 */
function scheduleFrame(cb: () => void): number {
  if (typeof document !== "undefined" && document.hidden) {
    return window.setTimeout(cb, 50) as unknown as number;
  }
  return requestAnimationFrame(cb);
}

function cancelFrame(handle: number): void {
  window.clearTimeout(handle);
  cancelAnimationFrame(handle);
}

type PanelMode = { mode: "history" } | { mode: "active"; sessionId: string; sessionTitle: string };

type AgentChatPanelProps = {
  workspaceId: string;
  featureId: string;
  onArtifactSaved?: (artifact: "product_spec" | "technical_design" | "tasks") => void;
  onStageTransition?: () => void;
  /** Fired when the session set changes (created / deleted) so parents can refresh their own lists. */
  onSessionsChanged?: () => void;
  requestSessionId?: string | null;
  /** Bumping this value (from the parent header) starts a fresh conversation. */
  newChatSignal?: number;
  /**
   * When true, use the new persistent subscription transport (T6).
   * Defaults to false to preserve backward-compat with the legacy per-turn
   * `/chat` endpoint during the migration period.
   */
  useSubscriptionTransport?: boolean;
  /**
   * Channel mode: never disable the composer while the agent streams — a
   * multi-user channel is async, so users keep typing while the agent replies.
   */
  nonBlocking?: boolean;
  /** Feature lifecycle status, used to generate empty-state starter CTA cards. */
  featureStatus?: string | null;
};

export function AgentChatPanel({
  workspaceId,
  featureId,
  onArtifactSaved,
  onStageTransition,
  onSessionsChanged,
  requestSessionId,
  newChatSignal,
  useSubscriptionTransport = false,
  nonBlocking = false,
  featureStatus,
}: AgentChatPanelProps) {
  const [panelMode, setPanelMode] = useState<PanelMode>({ mode: "history" });
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [messages, setMessages] = useState<HermesMessage[]>([]);
  const [status, setStatus] = useState<ChatStatus>("idle");
  const [agentWorking, setAgentWorking] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [models, setModels] = useState<ModelOption[]>([]);
  const [selectedModel, setSelectedModel] = useState("");
  const [unreadCounts, setUnreadCounts] = useState<UnreadMentionCounts>({
    total: 0,
    perSession: {},
  });
  const [workspaceMembers, setWorkspaceMembers] = useState<
    Record<
      string,
      {
        name: string | null;
        handle: string;
        email: string | null;
        role: string | null;
        avatarUrl: string | null;
      }
    >
  >({});
  const [emptyStateDismissed, setEmptyStateDismissed] = useState(false);
  const activeCTAMessageIdRef = useRef<string | null>(null);
  const meRef = useRef<{
    id: string;
    name: string;
    avatarUrl: string | null;
  } | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const msgIdCounter = useRef(0);

  const flushRafRef = useRef<number | null>(null);
  const deltaPendingRef = useRef<{ id: string; text: string }[]>([]);

  const thinkingRafRef = useRef<number | null>(null);
  const thinkingPendingRef = useRef<{ id: string; text: string }[]>([]);

  const lastMessageIdRef = useRef<string | null>(null);
  // Own messages optimistically appended by handleSubmit/handleCtaAction, awaiting
  // reconciliation with their server echo on the same subscription (see
  // handleThreadEvent). A queue rather than a single id — back-to-back sends can
  // both be in flight at once, and each needs its own slot so one echo doesn't
  // consume the wrong pending entry.
  const pendingOwnMessagesRef = useRef<{ id: string; content: string }[]>([]);
  const subscriptionSessionRef = useRef<string | null>(null);
  const streamingAssistantIdRef = useRef<string | null>(null);
  const [streamingAssistantId, setStreamingAssistantId] = useState<string | null>(null);
  /** Epoch ms when the current agent turn began, used to compute "Thought for …". */
  const turnStartRef = useRef<number | null>(null);
  const openSubscriptionRef = useRef<(sessionId: string, since?: string) => void>(() => {});

  const nextId = () => {
    msgIdCounter.current += 1;
    return `msg-${msgIdCounter.current}`;
  };

  useEffect(() => {
    return () => {
      if (flushRafRef.current != null) cancelFrame(flushRafRef.current);
      if (thinkingRafRef.current != null) cancelFrame(thinkingRafRef.current);
    };
  }, []);

  const fetchSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      const list = await listChatSessions(workspaceId, featureId);
      setSessions(list);
    } catch {
      setSessions([]);
    } finally {
      setSessionsLoading(false);
    }
  }, [workspaceId, featureId]);

  const refreshUnreadCounts = useCallback(async () => {
    if (!workspaceId) return;
    try {
      const data = await getUnreadMentions(workspaceId);
      setUnreadCounts(data);
    } catch {}
  }, [workspaceId]);

  useEffect(() => {
    void fetchSessions();
  }, [fetchSessions]);

  useEffect(() => {
    void refreshUnreadCounts();
    const id = setInterval(() => void refreshUnreadCounts(), 30_000);
    return () => clearInterval(id);
  }, [refreshUnreadCounts]);

  useEffect(() => {
    if (!nonBlocking || !workspaceId) return;
    let cancelled = false;
    void (async () => {
      const avatars: Record<string, string | null> = {};
      try {
        for (const m of await listWorkspaceMembers(workspaceId)) avatars[m.user_id] = m.avatar_url;
      } catch {
        /* ignore */
      }

      let orgId: string | undefined;
      try {
        const me = getMeData(await fetchMe());
        meRef.current = {
          id: me.user.id,
          name: displayNameOf(me.user.display_name, me.user.email) ?? "You",
          avatarUrl: me.user.avatar_url,
        };
        orgId = Object.keys(me.org_workspace_ids ?? {}).find((oid) => (me.org_workspace_ids?.[oid] ?? []).includes(workspaceId));
      } catch {
        /* ignore */
      }

      const map: Record<
        string,
        {
          name: string | null;
          handle: string;
          email: string | null;
          role: string | null;
          avatarUrl: string | null;
        }
      > = {};
      if (orgId) {
        try {
          for (const m of await fetchOrgMembers(orgId)) {
            map[m.user_id] = {
              name: displayNameOf(m.display_name, m.email),
              handle: deriveHandle(m.display_name, m.email),
              email: m.email ?? null,
              role: m.role ?? null,
              avatarUrl: avatars[m.user_id] ?? null,
            };
          }
        } catch {
          /* ignore */
        }
      }
      if (!cancelled) setWorkspaceMembers(map);
    })();
    return () => {
      cancelled = true;
    };
  }, [nonBlocking, workspaceId]);

  const resolveChannelAuthor = useCallback(
    (msg: HermesMessage): ChannelAuthor => {
      if (msg.role === "assistant") return { id: "agent", name: "Agent", handle: "agent", isAgent: true };
      const id = msg.authorId ?? msg.author?.id;
      const member = id ? workspaceMembers[id] : undefined;
      const handle = member?.handle ?? null;
      const email = member?.email ?? null;
      const roleLabel = member?.role ?? msg.author?.roleLabel ?? null;
      if (msg.author?.name)
        return {
          id,
          name: msg.author.name,
          handle,
          email,
          avatarUrl: msg.author.avatarUrl,
          roleLabel,
          isAgent: false,
        };
      if (id && meRef.current && id === meRef.current.id) {
        return {
          id,
          name: meRef.current.name,
          handle,
          email,
          avatarUrl: meRef.current.avatarUrl,
          roleLabel,
          isAgent: false,
        };
      }
      if (member?.name)
        return {
          id,
          name: member.name,
          handle,
          email,
          avatarUrl: member.avatarUrl,
          roleLabel,
          isAgent: false,
        };
      return {
        id,
        name: "Member",
        handle,
        email,
        avatarUrl: msg.author?.avatarUrl ?? member?.avatarUrl,
        roleLabel,
        isAgent: false,
      };
    },
    [workspaceMembers],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { models: list, default: def } = await listModels();
        if (cancelled) return;
        setModels(list);
        // Prefer the user's last-selected model (persisted in the zustand store),
        // then the server default, so the picker remembers the choice across
        // sessions/reloads.
        const remembered = useLocalWorkspaceStore.getState().lastModel;
        const valid = remembered && list.some((m) => m.id === remembered) ? remembered : null;
        setSelectedModel((cur) => cur || valid || def || list[0]?.id || "");
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleModelChange = useCallback((modelId: string) => {
    setSelectedModel(modelId);
    useLocalWorkspaceStore.getState().setLastModel(modelId);
  }, []);

  const enterActiveMode = useCallback((sessionId: string, sessionTitle: string) => {
    setMessages([]);
    setStatus("idle");
    setAgentWorking(false);
    setInputValue("");
    setPanelMode({ mode: "active", sessionId, sessionTitle });
  }, []);

  // RAF queue: drain ONE pending word per animation frame so React renders
  // each piece individually. React 18 batches all setState calls that land
  // in the same synchronous tick — a queue + RAF gives us one setState (→ one
  // render) per frame, giving smooth per-word streaming even when many SSE
  // frames arrive in the same TCP packet.
  // Named function expression: the inner `drainOneDelta` resolves to this
  // function's own name binding (valid inside its body), so the recursive RAF
  // schedule doesn't reference the outer const before it's declared.
  const drainOneDelta = useCallback(function drainOneDelta() {
    flushRafRef.current = null;
    const item = deltaPendingRef.current.shift();
    if (!item) return;
    setMessages((prev) => prev.map((m) => (m.id === item.id ? { ...m, content: m.content + item.text } : m)));
    if (deltaPendingRef.current.length > 0) {
      flushRafRef.current = scheduleFrame(drainOneDelta);
    }
  }, []);

  const appendDelta = useCallback(
    (messageId: string, text: string) => {
      deltaPendingRef.current.push({ id: messageId, text });
      if (flushRafRef.current == null) {
        flushRafRef.current = scheduleFrame(drainOneDelta);
      }
    },
    [drainOneDelta],
  );

  const drainOneThinking = useCallback(function drainOneThinking() {
    thinkingRafRef.current = null;
    const item = thinkingPendingRef.current.shift();
    if (!item) return;
    setMessages((prev) => prev.map((m) => (m.id === item.id ? { ...m, thinking: (m.thinking ?? "") + item.text } : m)));
    if (thinkingPendingRef.current.length > 0) {
      thinkingRafRef.current = scheduleFrame(drainOneThinking);
    }
  }, []);

  const appendThinkingDelta = useCallback(
    (messageId: string, content: string) => {
      thinkingPendingRef.current.push({ id: messageId, text: content });
      if (thinkingRafRef.current == null) {
        thinkingRafRef.current = scheduleFrame(drainOneThinking);
      }
    },
    [drainOneThinking],
  );

  const finalizeStreamForMessage = useCallback(() => {
    // Flush all remaining queued words immediately when the stream ends.
    if (flushRafRef.current != null) {
      cancelFrame(flushRafRef.current);
      flushRafRef.current = null;
    }
    const remaining = deltaPendingRef.current.splice(0);
    if (remaining.length > 0) {
      setMessages((prev) => {
        let next = prev;
        for (const item of remaining) {
          next = next.map((m) => (m.id === item.id ? { ...m, content: m.content + item.text } : m));
        }
        return next;
      });
    }
  }, []);

  const ensureStreamingAssistant = useCallback(() => {
    if (streamingAssistantIdRef.current) return streamingAssistantIdRef.current;
    if (turnStartRef.current == null) turnStartRef.current = Date.now();
    msgIdCounter.current += 1;
    const id = `msg-${msgIdCounter.current}`;
    streamingAssistantIdRef.current = id;
    setStreamingAssistantId(id);
    setMessages((prev) => [...prev, { id, role: "assistant", content: "", toolCalls: [] }]);
    return id;
  }, []);

  /** Stamp the finished turn's wall-clock duration onto its message for the "Thought for …" label. */
  const recordTurnDuration = useCallback((messageId: string | null) => {
    if (messageId && turnStartRef.current != null) {
      const secs = Math.max(0, Math.round((Date.now() - turnStartRef.current) / 1000));
      setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, thinkingSeconds: secs } : m)));
    }
    turnStartRef.current = null;
  }, []);

  const handleThreadEvent = useCallback(
    (event: ThreadEvent) => {
      if (event.type === "message.created") {
        const msg = event.message;
        lastMessageIdRef.current = msg.id;
        setEmptyStateDismissed(true);
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          // This is the server echo of a message we just sent ourselves: it's
          // already shown via the optimistic entry handleSubmit/handleCtaAction
          // appended, so reconcile that entry's temp id instead of appending a
          // duplicate. Match by content since the echo carries no temp id back;
          // several own-sends can be in flight at once, so search the whole
          // pending queue rather than assuming FIFO order.
          if (msg.authorId && meRef.current && msg.authorId === meRef.current.id) {
            const pendingIdx = pendingOwnMessagesRef.current.findIndex((p) => p.content === msg.content && prev.some((m) => m.id === p.id));
            if (pendingIdx !== -1) {
              const tempId = pendingOwnMessagesRef.current[pendingIdx].id;
              pendingOwnMessagesRef.current = pendingOwnMessagesRef.current.filter((_, i) => i !== pendingIdx);
              return prev.map((m) => (m.id === tempId ? msg : m));
            }
          }
          return [...prev, msg];
        });
        if (msg.role === "assistant") {
          if (turnStartRef.current == null) turnStartRef.current = Date.now();
          streamingAssistantIdRef.current = msg.id;
          setStreamingAssistantId(msg.id);
          setStatus("streaming");
        }
        void refreshUnreadCounts();
        // Keep the history list current (new session title / last-message excerpt).
        void fetchSessions();
        onSessionsChanged?.();
      } else if (event.type === "delta") {
        const targetId = event.messageId || streamingAssistantIdRef.current || ensureStreamingAssistant();
        appendDelta(targetId, event.text);
      } else if (event.type === "reasoning") {
        const targetId = event.messageId || streamingAssistantIdRef.current || ensureStreamingAssistant();
        appendThinkingDelta(targetId, event.content);
      } else if (event.type === "tool_start") {
        const targetId = event.messageId || streamingAssistantIdRef.current;
        if (!targetId) return;
        const toolEntry: ToolCallEntry = {
          callId: event.callId,
          name: event.name,
          status: "running",
        };
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id !== targetId) return m;
            const existing = m.toolCalls ?? [];
            const hasEntry = existing.some((tc) => tc.callId === event.callId);
            return {
              ...m,
              toolCalls: hasEntry ? existing.map((tc) => (tc.callId === event.callId ? { ...tc, name: event.name } : tc)) : [...existing, toolEntry],
            };
          }),
        );
      } else if (event.type === "tool_result") {
        const targetId = event.messageId || streamingAssistantIdRef.current;
        if (!targetId) return;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === targetId
              ? {
                  ...m,
                  toolCalls: (m.toolCalls ?? []).map((tc) => (tc.callId === event.callId ? { ...tc, status: "done" as const, output: event.output } : tc)),
                }
              : m,
          ),
        );
      } else if (event.type === "turn.cta_suggestions") {
        const { suggestions } = event;
        setMessages((prev) => {
          let targetId = streamingAssistantIdRef.current;
          if (!targetId) {
            for (let i = prev.length - 1; i >= 0; i--) {
              if (prev[i].role === "assistant") {
                targetId = prev[i].id;
                break;
              }
            }
          }
          if (!targetId) return prev;
          activeCTAMessageIdRef.current = targetId;
          return prev.map((m) => (m.id === targetId ? { ...m, ctaSuggestions: suggestions, ctaActive: true } : m));
        });
      } else if (event.type === "artifact_saved") {
        onArtifactSaved?.(event.artifact);
      } else if (event.type === "agent.working") {
        ensureStreamingAssistant();
        setStatus("streaming");
        setAgentWorking(true);
      } else if (event.type === "turn.stopped") {
        if (event.messageId) {
          setMessages((prev) => prev.map((m) => (m.id === event.messageId ? { ...m, finishReason: "stopped" } : m)));
        }
        const targetId = streamingAssistantIdRef.current;
        if (targetId) finalizeStreamForMessage();
        recordTurnDuration(targetId);
        streamingAssistantIdRef.current = null;
        setStreamingAssistantId(null);
        setAgentWorking(false);
        setStatus("idle");
      } else if (event.type === "error") {
        const targetId = streamingAssistantIdRef.current;
        if (targetId) finalizeStreamForMessage();
        recordTurnDuration(targetId);
        streamingAssistantIdRef.current = null;
        setStreamingAssistantId(null);
        if (targetId) {
          setMessages((prev) => prev.map((m) => (m.id === targetId ? { ...m, content: m.content || `Error: ${event.message}` } : m)));
        }
        setAgentWorking(false);
        setStatus("error");
      } else if (event.type === "done") {
        const targetId = streamingAssistantIdRef.current;
        if (targetId) finalizeStreamForMessage();
        recordTurnDuration(targetId);
        streamingAssistantIdRef.current = null;
        setStreamingAssistantId(null);
        setAgentWorking(false);
        setStatus("idle");
      }
    },
    [onArtifactSaved, appendDelta, appendThinkingDelta, finalizeStreamForMessage, recordTurnDuration, refreshUnreadCounts, ensureStreamingAssistant, fetchSessions, onSessionsChanged],
  );

  /** Open (or reopen) the persistent subscription for a thread. */
  const openSubscription = useCallback(
    (sessionId: string, since?: string) => {
      abortRef.current?.abort();
      const ctrl = subscribeToThread(
        sessionId,
        since ?? null,
        handleThreadEvent,
        () => {
          setStatus((prev) => (prev === "streaming" ? "idle" : prev));
          if (subscriptionSessionRef.current && !ctrl.signal.aborted) {
            const cursor = lastMessageIdRef.current ?? undefined;
            openSubscriptionRef.current(subscriptionSessionRef.current, cursor);
          }
        },
        (err) => {
          if (err?.name === "AbortError") return;
          setStatus("error");
        },
      );
      abortRef.current = ctrl;
      subscriptionSessionRef.current = sessionId;
    },
    [handleThreadEvent],
  );
  useEffect(() => {
    openSubscriptionRef.current = openSubscription;
  }, [openSubscription]);

  const handleDeleteSession = useCallback(
    async (id: string) => {
      try {
        await deleteSession(id);
      } catch {
        return;
      }
      // If the deleted session is the one open, return to the history view.
      if (panelMode.mode === "active" && panelMode.sessionId === id) {
        abortRef.current?.abort();
        abortRef.current = null;
        subscriptionSessionRef.current = null;
        streamingAssistantIdRef.current = null;
        setStreamingAssistantId(null);
        turnStartRef.current = null;
        setMessages([]);
        setPanelMode({ mode: "history" });
        setStatus("idle");
      }
      void fetchSessions();
      onSessionsChanged?.();
    },
    [panelMode, fetchSessions, onSessionsChanged],
  );

  const handleDeleteAllSessions = useCallback(async () => {
    try {
      await deleteAllSessions(workspaceId, featureId);
    } catch {
      return;
    }
    abortRef.current?.abort();
    abortRef.current = null;
    subscriptionSessionRef.current = null;
    streamingAssistantIdRef.current = null;
    setStreamingAssistantId(null);
    turnStartRef.current = null;
    setMessages([]);
    setPanelMode({ mode: "history" });
    setStatus("idle");
    void fetchSessions();
    onSessionsChanged?.();
  }, [workspaceId, featureId, fetchSessions, onSessionsChanged]);

  const handleSessionSelect = useCallback(
    async (id: string) => {
      const session = sessions.find((s) => s.id === id);
      if (session?.model && models.some((m) => m.id === session.model)) {
        setSelectedModel(session.model);
      }
      setMessages([]);
      setInputValue("");
      setPanelMode({
        mode: "active",
        sessionId: id,
        sessionTitle: session?.title ?? "",
      });
      setStatus("connecting");

      void markThreadRead(id).then(() => {
        setUnreadCounts((prev) => ({
          total: Math.max(0, prev.total - (prev.perSession[id] ?? 0)),
          perSession: { ...prev.perSession, [id]: 0 },
        }));
      });

      try {
        let history: HermesMessage[];
        if (useSubscriptionTransport) {
          history = await getThreadMessages(id);
        } else {
          history = await getSessionMessages(workspaceId, featureId, id);
        }
        setMessages(history);
        const last = history[history.length - 1];
        if (last) lastMessageIdRef.current = last.id;
        setStatus("idle");
        if (useSubscriptionTransport) {
          openSubscription(id);
        }
      } catch {
        setMessages([]);
        setStatus("idle");
        if (useSubscriptionTransport) {
          openSubscription(id);
        }
      }
    },
    [sessions, workspaceId, featureId, models, useSubscriptionTransport, openSubscription],
  );

  const requestedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!requestSessionId || requestSessionId === requestedRef.current) return;
    requestedRef.current = requestSessionId;
    void handleSessionSelect(requestSessionId);
  }, [requestSessionId, handleSessionSelect]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  // When the user reloads or closes the tab mid-turn, the SSE stream drops but
  // the agent keeps generating server-side. Treat that the same as pressing
  // Stop: cancel the in-flight turn on pagehide. We mirror the live turn state
  // into a ref so the listener (registered once) always sees the latest value.
  // Gated to the 1:1 agent chat (not channels — a shared turn shouldn't stop
  // for everyone because one viewer reloaded). pagehide fires on reload / close
  // / navigation but NOT on transient network blips, so auto-reconnect after a
  // blip is unaffected.
  const inFlightSessionRef = useRef<string | null>(null);
  useEffect(() => {
    const streaming = status === "streaming" || status === "connecting" || agentWorking;
    inFlightSessionRef.current = !nonBlocking && panelMode.mode === "active" && streaming ? panelMode.sessionId : null;
  }, [nonBlocking, panelMode, status, agentWorking]);
  useEffect(() => {
    const onPageHide = () => {
      const sessionId = inFlightSessionRef.current;
      if (sessionId) void cancelAgentTurn(sessionId);
    };
    window.addEventListener("pagehide", onPageHide);
    return () => window.removeEventListener("pagehide", onPageHide);
  }, []);

  const handleNewChat = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    subscriptionSessionRef.current = null;
    lastMessageIdRef.current = null;
    streamingAssistantIdRef.current = null;
    setStreamingAssistantId(null);
    turnStartRef.current = null;
    activeCTAMessageIdRef.current = null;
    if (flushRafRef.current != null) {
      cancelFrame(flushRafRef.current);
      flushRafRef.current = null;
    }
    if (thinkingRafRef.current != null) {
      cancelFrame(thinkingRafRef.current);
      thinkingRafRef.current = null;
    }
    deltaPendingRef.current = [];
    thinkingPendingRef.current = [];
    setMessages([]);
    setInputValue("");
    setPickerOpen(false);
    setStatus("idle");
    setAgentWorking(false);
    setEmptyStateDismissed(false);
    // Land on the history list (with the composer below) so past conversations
    // are visible; typing the first message starts a fresh session.
    setPanelMode({ mode: "history" });
    void fetchSessions();
  }, [fetchSessions]);

  useEffect(() => {
    if (newChatSignal === undefined || newChatSignal === 0) return;
    handleNewChat();
  }, [newChatSignal, handleNewChat]);

  const handleInputChange = useCallback((value: string) => {
    setInputValue(value);
    if (value.startsWith("/")) {
      setPickerOpen(true);
    } else {
      setPickerOpen(false);
    }
  }, []);

  const handlePickerSelect = useCallback((command: string) => {
    setInputValue(command + " ");
    setPickerOpen(false);
  }, []);

  const handlePickerClose = useCallback(() => {
    setPickerOpen(false);
  }, []);

  const dismissActiveCta = useCallback(() => {
    const id = activeCTAMessageIdRef.current;
    if (!id) return;
    activeCTAMessageIdRef.current = null;
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ctaActive: false } : m)));
  }, []);

  const handleCtaAction = useCallback(
    (actionText: string) => {
      setInputValue("");
      setPickerOpen(false);
      setEmptyStateDismissed(true);
      dismissActiveCta();
      void (async () => {
        let sessionId: string;
        let sessionTitle: string;

        const needsNewSession = panelMode.mode === "history" || (panelMode.mode === "active" && !panelMode.sessionId);
        if (needsNewSession) {
          setStatus("connecting");
          try {
            const created = await createChatSession(workspaceId, featureId);
            sessionId = created.session_id;
            sessionTitle = actionText.trim().slice(0, 60);
            enterActiveMode(sessionId, sessionTitle);
            if (useSubscriptionTransport) openSubscriptionRef.current(sessionId);
            void fetchSessions();
            onSessionsChanged?.();
          } catch {
            setStatus("error");
            return;
          }
        } else {
          sessionId = panelMode.sessionId;
          sessionTitle = panelMode.sessionTitle;
        }

        const userMsg: HermesMessage = {
          id: `msg-${++msgIdCounter.current}`,
          role: "user",
          content: actionText,
          authorId: meRef.current?.id,
          createdAt: Date.now() / 1000,
        };

        setMessages((prev) => [...prev, userMsg]);

        if (useSubscriptionTransport) {
          pendingOwnMessagesRef.current.push({ id: userMsg.id, content: userMsg.content });
          setStatus("connecting");
          try {
            const { message_id, agent_triggered } = await sendThreadMessage(sessionId, actionText);
            // If the SSE echo already reconciled this entry (handleThreadEvent),
            // it's no longer in the queue and this filter is a no-op.
            pendingOwnMessagesRef.current = pendingOwnMessagesRef.current.filter((p) => p.id !== userMsg.id);
            setMessages((prev) => prev.map((m) => (m.id === userMsg.id ? { ...m, id: message_id } : m)));
            setStatus(agent_triggered ? "streaming" : "idle");
          } catch {
            setStatus("error");
          }
          return;
        }

        setStatus("streaming");
        const assistantId = `msg-${++msgIdCounter.current}`;
        turnStartRef.current = Date.now();
        setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "", toolCalls: [] }]);

        const finalizeStream = () => {
          if (flushRafRef.current != null) {
            cancelFrame(flushRafRef.current);
            flushRafRef.current = null;
          }
        };

        abortRef.current = streamChatTurn(
          {
            workspaceId,
            featureId,
            sessionId,
            message: actionText,
            model: selectedModel,
          },
          (ev) => {
            if (ev.type === "delta") {
              appendDelta(assistantId, ev.text);
            } else if (ev.type === "reasoning") {
              appendThinkingDelta(assistantId, ev.content);
            } else if (ev.type === "error") {
              finalizeStream();
              recordTurnDuration(assistantId);
              setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: m.content || `Error: ${ev.message}` } : m)));
              setStatus("error");
            }
          },
          () => {
            finalizeStream();
            recordTurnDuration(assistantId);
            setStatus("idle");
          },
          (err) => {
            finalizeStream();
            recordTurnDuration(assistantId);
            if (err?.name === "AbortError") return;
            setStatus("error");
          },
        );
      })();
    },
    [
      panelMode,
      workspaceId,
      featureId,
      selectedModel,
      useSubscriptionTransport,
      enterActiveMode,
      fetchSessions,
      onSessionsChanged,
      dismissActiveCta,
      appendDelta,
      appendThinkingDelta,
      recordTurnDuration,
    ],
  );

  const handleSubmit = useCallback(async () => {
    if (!inputValue.trim()) return;
    if (!nonBlocking && (status === "connecting" || status === "streaming")) {
      return;
    }
    setPickerOpen(false);

    let sessionId: string;
    let sessionTitle: string;

    const needsNewSession = panelMode.mode === "history" || (panelMode.mode === "active" && !panelMode.sessionId);
    if (needsNewSession) {
      setStatus("connecting");
      try {
        const created = await createChatSession(workspaceId, featureId);
        sessionId = created.session_id;
        sessionTitle = inputValue.trim().slice(0, 60);
        enterActiveMode(sessionId, sessionTitle);
        if (useSubscriptionTransport) {
          openSubscription(sessionId);
        }
        // Refresh the history list so the new session appears immediately
        // (the list is otherwise only loaded on mount).
        void fetchSessions();
        onSessionsChanged?.();
      } catch {
        setStatus("error");
        return;
      }
    } else {
      sessionId = panelMode.sessionId;
      sessionTitle = panelMode.sessionTitle;
    }

    const userMsg: HermesMessage = {
      id: nextId(),
      role: "user",
      content: inputValue.trim(),
      authorId: meRef.current?.id,
      createdAt: Date.now() / 1000,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setEmptyStateDismissed(true);
    dismissActiveCta();

    if (useSubscriptionTransport) {
      pendingOwnMessagesRef.current.push({ id: userMsg.id, content: userMsg.content });
      setStatus("connecting");
      try {
        const { message_id, agent_triggered } = await sendThreadMessage(sessionId, userMsg.content);
        // If the SSE echo already reconciled this entry (handleThreadEvent),
        // it's no longer in the queue and this filter is a no-op.
        pendingOwnMessagesRef.current = pendingOwnMessagesRef.current.filter((p) => p.id !== userMsg.id);
        setMessages((prev) => prev.map((m) => (m.id === userMsg.id ? { ...m, id: message_id } : m)));
        setStatus(agent_triggered ? "streaming" : "idle");
      } catch {
        setStatus("error");
      }
      return;
    }

    setStatus("streaming");

    const assistantId = nextId();
    turnStartRef.current = Date.now();
    setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "", toolCalls: [] }]);

    const finalizeStream = () => {
      if (flushRafRef.current != null) {
        cancelFrame(flushRafRef.current);
        flushRafRef.current = null;
      }
    };

    abortRef.current = streamChatTurn(
      {
        workspaceId,
        featureId,
        sessionId,
        message: userMsg.content,
        model: selectedModel,
      },
      (event) => {
        if (event.type === "delta") {
          appendDelta(assistantId, event.text);
        } else if (event.type === "reasoning") {
          appendThinkingDelta(assistantId, event.content);
        } else if (event.type === "tool_start") {
          const toolEntry: ToolCallEntry = {
            callId: event.callId,
            name: event.name,
            status: "running",
          };
          setMessages((prev) =>
            prev.map((m) => {
              if (m.id !== assistantId) return m;
              const existing = m.toolCalls ?? [];
              const hasEntry = existing.some((tc) => tc.callId === event.callId);
              return {
                ...m,
                toolCalls: hasEntry ? existing.map((tc) => (tc.callId === event.callId ? { ...tc, name: event.name } : tc)) : [...existing, toolEntry],
              };
            }),
          );
        } else if (event.type === "tool_result") {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? {
                    ...m,
                    toolCalls: (m.toolCalls ?? []).map((tc) =>
                      tc.callId === event.callId
                        ? {
                            ...tc,
                            status: "done" as const,
                            output: event.output,
                          }
                        : tc,
                    ),
                  }
                : m,
            ),
          );
        } else if (event.type === "artifact_saved") {
          onArtifactSaved?.(event.artifact);
        } else if (event.type === "error") {
          finalizeStream();
          recordTurnDuration(assistantId);
          setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: m.content || `Error: ${event.message}` } : m)));
          setStatus("error");
        }
      },
      () => {
        finalizeStream();
        recordTurnDuration(assistantId);
        setStatus("idle");
      },
      (err) => {
        finalizeStream();
        recordTurnDuration(assistantId);
        if (err?.name === "AbortError") return;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: m.content || `Connection error: ${err.message}`,
                }
              : m,
          ),
        );
        setStatus("error");
      },
    );
  }, [
    inputValue,
    status,
    panelMode,
    workspaceId,
    featureId,
    selectedModel,
    onArtifactSaved,
    enterActiveMode,
    useSubscriptionTransport,
    nonBlocking,
    openSubscription,
    fetchSessions,
    onSessionsChanged,
    appendDelta,
    appendThinkingDelta,
    dismissActiveCta,
    recordTurnDuration,
  ]);

  const handleStop = useCallback(() => {
    if (panelMode.mode !== "active") return;
    void cancelAgentTurn(panelMode.sessionId).catch(() => {
      // 404 means the turn already finished naturally — safe to ignore
    });
  }, [panelMode]);

  const isActive = panelMode.mode === "active";

  const mentionMembers = useMemo<ThreadMember[]>(() => {
    const humans: ThreadMember[] = Object.entries(workspaceMembers)
      .map(([id, m]) => ({
        id,
        name: m.name ?? m.handle,
        handle: m.handle,
        avatarUrl: m.avatarUrl,
        kind: "user" as const,
      }))
      .filter((m) => m.handle);
    return [{ id: "agent", name: "Hermes Agent", handle: "agent", kind: "agent" }, ...humans];
  }, [workspaceMembers]);

  const promptHistory = useMemo(
    () =>
      messages
        .filter((m) => m.role === "user")
        .map((m) => m.content)
        .reverse(),
    [messages],
  );

  return (
    <div data-agent-chat-panel className="flex h-full flex-col bg-surface">
      {/* Body */}
      {isActive ? (
        <Conversation>
          {nonBlocking ? (
            <ChannelMessageList messages={messages} status={status} streamingAssistantId={streamingAssistantId} resolveAuthor={resolveChannelAuthor} onCtaAction={handleCtaAction} />
          ) : (
            <MessageThread
              messages={messages}
              status={status}
              streamingAssistantId={streamingAssistantId}
              onStageTransition={onStageTransition}
              onCtaAction={handleCtaAction}
              featureStatus={featureStatus}
              emptyStateDismissed={emptyStateDismissed}
            />
          )}
        </Conversation>
      ) : (
        <SessionHistoryList
          sessions={sessions}
          loading={sessionsLoading}
          onSelect={handleSessionSelect}
          onDelete={handleDeleteSession}
          onDeleteAll={handleDeleteAllSessions}
          unreadCounts={unreadCounts.perSession}
        />
      )}

      {/* Input */}
      <div className="relative shrink-0">
        {pickerOpen && <SlashCommandPicker query={inputValue} onSelect={handlePickerSelect} onClose={handlePickerClose} />}
        <PromptInput
          value={inputValue}
          onChange={handleInputChange}
          onSubmit={() => void handleSubmit()}
          onStop={handleStop}
          status={status}
          isAgentWorking={agentWorking}
          nonBlocking={nonBlocking}
          history={promptHistory}
          models={models}
          selectedModel={selectedModel}
          onModelChange={handleModelChange}
          members={mentionMembers}
        />
      </div>
    </div>
  );
}
