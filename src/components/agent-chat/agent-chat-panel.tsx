"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { ChatSessionSummary, ModelOption, ThreadEvent, UnreadMentionCounts } from "@/services/hermes-agent/chat";
import {
  createChatSession,
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

type PanelMode = { mode: "history" } | { mode: "active"; sessionId: string; sessionTitle: string };

type AgentChatPanelProps = {
  workspaceId: string;
  featureId: string;
  onArtifactSaved?: (artifact: "product_spec" | "technical_design") => void;
  onStageTransition?: () => void;
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
};

export function AgentChatPanel({
  workspaceId,
  featureId,
  onArtifactSaved,
  onStageTransition,
  requestSessionId,
  newChatSignal,
  useSubscriptionTransport = false,
  nonBlocking = false,
}: AgentChatPanelProps) {
  const [panelMode, setPanelMode] = useState<PanelMode>({ mode: "history" });
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [messages, setMessages] = useState<HermesMessage[]>([]);
  const [status, setStatus] = useState<ChatStatus>("idle");
  const [inputValue, setInputValue] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [models, setModels] = useState<ModelOption[]>([]);
  const [selectedModel, setSelectedModel] = useState("");
  const [unreadCounts, setUnreadCounts] = useState<UnreadMentionCounts>({ total: 0, perSession: {} });
  const [workspaceMembers, setWorkspaceMembers] = useState<Record<string, { name: string | null; handle: string; email: string | null; role: string | null; avatarUrl: string | null }>>({});
  const meRef = useRef<{ id: string; name: string; avatarUrl: string | null } | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const msgIdCounter = useRef(0);

  const deltaBufferRef = useRef<Map<string, string>>(new Map());
  const flushRafRef = useRef<number | null>(null);

  const lastMessageIdRef = useRef<string | null>(null);
  const subscriptionSessionRef = useRef<string | null>(null);
  const streamingAssistantIdRef = useRef<string | null>(null);
  const openSubscriptionRef = useRef<(sessionId: string, since?: string) => void>(() => {});

  const nextId = () => {
    msgIdCounter.current += 1;
    return `msg-${msgIdCounter.current}`;
  };

  useEffect(() => {
    return () => {
      if (flushRafRef.current != null) cancelAnimationFrame(flushRafRef.current);
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
        meRef.current = { id: me.user.id, name: displayNameOf(me.user.display_name, me.user.email) ?? "You", avatarUrl: me.user.avatar_url };
        orgId = Object.keys(me.org_workspace_ids ?? {}).find((oid) => (me.org_workspace_ids?.[oid] ?? []).includes(workspaceId));
      } catch {
        /* ignore */
      }

      const map: Record<string, { name: string | null; handle: string; email: string | null; role: string | null; avatarUrl: string | null }> = {};
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
      if (msg.author?.name) return { id, name: msg.author.name, handle, email, avatarUrl: msg.author.avatarUrl, roleLabel, isAgent: false };
      if (id && meRef.current && id === meRef.current.id) {
        return { id, name: meRef.current.name, handle, email, avatarUrl: meRef.current.avatarUrl, roleLabel, isAgent: false };
      }
      if (member?.name) return { id, name: member.name, handle, email, avatarUrl: member.avatarUrl, roleLabel, isAgent: false };
      return { id, name: "Member", handle, email, avatarUrl: msg.author?.avatarUrl ?? member?.avatarUrl, roleLabel, isAgent: false };
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
        setSelectedModel((cur) => cur || def || list[0]?.id || "");
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const enterActiveMode = useCallback((sessionId: string, sessionTitle: string) => {
    setMessages([]);
    setStatus("idle");
    setInputValue("");
    setPanelMode({ mode: "active", sessionId, sessionTitle });
  }, []);

  const flushDeltasForMessage = useCallback((messageId: string) => {
    flushRafRef.current = null;
    const text = deltaBufferRef.current.get(messageId);
    if (!text) return;
    deltaBufferRef.current.delete(messageId);
    setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, content: m.content + text } : m)));
  }, []);

  const scheduleFlush = useCallback(
    (messageId: string) => {
      if (flushRafRef.current != null) return;
      flushRafRef.current = requestAnimationFrame(() => flushDeltasForMessage(messageId));
    },
    [flushDeltasForMessage],
  );

  const finalizeStreamForMessage = useCallback(
    (messageId: string) => {
      if (flushRafRef.current != null) {
        cancelAnimationFrame(flushRafRef.current);
        flushRafRef.current = null;
      }
      flushDeltasForMessage(messageId);
    },
    [flushDeltasForMessage],
  );

  const ensureStreamingAssistant = useCallback(() => {
    if (streamingAssistantIdRef.current) return streamingAssistantIdRef.current;
    msgIdCounter.current += 1;
    const id = `msg-${msgIdCounter.current}`;
    streamingAssistantIdRef.current = id;
    setMessages((prev) => [...prev, { id, role: "assistant", content: "", toolCalls: [] }]);
    return id;
  }, []);

  const handleThreadEvent = useCallback(
    (event: ThreadEvent) => {
      if (event.type === "message.created") {
        const msg = event.message;
        lastMessageIdRef.current = msg.id;
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        if (msg.role === "assistant") {
          streamingAssistantIdRef.current = msg.id;
          setStatus("streaming");
        }
        void refreshUnreadCounts();
      } else if (event.type === "delta") {
        const targetId = event.messageId || streamingAssistantIdRef.current || ensureStreamingAssistant();
        deltaBufferRef.current.set(targetId, (deltaBufferRef.current.get(targetId) ?? "") + event.text);
        scheduleFlush(targetId);
      } else if (event.type === "tool_start") {
        const targetId = event.messageId || streamingAssistantIdRef.current;
        if (!targetId) return;
        const toolEntry: ToolCallEntry = { callId: event.callId, name: event.name, status: "running" };
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
          prev.map((m) => (m.id === targetId ? { ...m, toolCalls: (m.toolCalls ?? []).map((tc) => (tc.callId === event.callId ? { ...tc, status: "done" as const, output: event.output } : tc)) } : m)),
        );
      } else if (event.type === "artifact_saved") {
        onArtifactSaved?.(event.artifact);
      } else if (event.type === "agent.working") {
        ensureStreamingAssistant();
        setStatus("streaming");
      } else if (event.type === "error") {
        const targetId = streamingAssistantIdRef.current;
        if (targetId) finalizeStreamForMessage(targetId);
        if (targetId) {
          setMessages((prev) => prev.map((m) => (m.id === targetId ? { ...m, content: m.content || `Error: ${event.message}` } : m)));
        }
        setStatus("error");
      } else if (event.type === "done") {
        const targetId = streamingAssistantIdRef.current;
        if (targetId) finalizeStreamForMessage(targetId);
        streamingAssistantIdRef.current = null;
        setStatus("idle");
      }
    },
    [onArtifactSaved, scheduleFlush, finalizeStreamForMessage, refreshUnreadCounts, ensureStreamingAssistant],
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

  const handleSessionSelect = useCallback(
    async (id: string) => {
      const session = sessions.find((s) => s.id === id);
      if (session?.model && models.some((m) => m.id === session.model)) {
        setSelectedModel(session.model);
      }
      setMessages([]);
      setInputValue("");
      setPanelMode({ mode: "active", sessionId: id, sessionTitle: session?.title ?? "" });
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

  const handleNewChat = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    subscriptionSessionRef.current = null;
    lastMessageIdRef.current = null;
    streamingAssistantIdRef.current = null;
    deltaBufferRef.current.clear();
    setMessages([]);
    setInputValue("");
    setPickerOpen(false);
    setStatus("idle");
    setPanelMode({ mode: "active", sessionId: "", sessionTitle: "" });
  }, []);

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

    if (useSubscriptionTransport) {
      setStatus("connecting");
      try {
        const { message_id, agent_triggered } = await sendThreadMessage(sessionId, userMsg.content);
        setMessages((prev) => prev.map((m) => (m.id === userMsg.id ? { ...m, id: message_id } : m)));
        setStatus(agent_triggered ? "streaming" : "idle");
      } catch {
        setStatus("error");
      }
      return;
    }

    setStatus("streaming");

    const assistantId = nextId();
    setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "", toolCalls: [] }]);

    const flushDelta = () => {
      flushRafRef.current = null;
      const text = deltaBufferRef.current.get(assistantId) ?? "";
      if (!text) return;
      deltaBufferRef.current.delete(assistantId);
      setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + text } : m)));
    };
    const scheduleFlushLegacy = () => {
      if (flushRafRef.current != null) return;
      flushRafRef.current = requestAnimationFrame(flushDelta);
    };
    const finalizeStream = () => {
      if (flushRafRef.current != null) {
        cancelAnimationFrame(flushRafRef.current);
        flushRafRef.current = null;
      }
      flushDelta();
    };

    abortRef.current = streamChatTurn(
      { workspaceId, featureId, sessionId, message: userMsg.content, model: selectedModel },
      (event) => {
        if (event.type === "delta") {
          deltaBufferRef.current.set(assistantId, (deltaBufferRef.current.get(assistantId) ?? "") + event.text);
          scheduleFlushLegacy();
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
                    toolCalls: (m.toolCalls ?? []).map((tc) => (tc.callId === event.callId ? { ...tc, status: "done" as const, output: event.output } : tc)),
                  }
                : m,
            ),
          );
        } else if (event.type === "artifact_saved") {
          onArtifactSaved?.(event.artifact);
        } else if (event.type === "error") {
          finalizeStream();
          setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: m.content || `Error: ${event.message}` } : m)));
          setStatus("error");
        }
      },
      () => {
        finalizeStream();
        setStatus("idle");
      },
      (err) => {
        finalizeStream();
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
  }, [inputValue, status, panelMode, workspaceId, featureId, selectedModel, onArtifactSaved, enterActiveMode, useSubscriptionTransport, nonBlocking, openSubscription]);

  const isActive = panelMode.mode === "active";

  const mentionMembers = useMemo<ThreadMember[]>(() => {
    const humans: ThreadMember[] = Object.entries(workspaceMembers)
      .map(([id, m]) => ({ id, name: m.name ?? m.handle, handle: m.handle, avatarUrl: m.avatarUrl, kind: "user" as const }))
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
            <ChannelMessageList messages={messages} status={status} resolveAuthor={resolveChannelAuthor} />
          ) : (
            <MessageThread messages={messages} status={status} onStageTransition={onStageTransition} />
          )}
        </Conversation>
      ) : (
        <SessionHistoryList sessions={sessions} loading={sessionsLoading} onSelect={handleSessionSelect} unreadCounts={unreadCounts.perSession} />
      )}

      {/* Input */}
      <div className="relative shrink-0">
        {pickerOpen && <SlashCommandPicker query={inputValue} onSelect={handlePickerSelect} onClose={handlePickerClose} />}
        <PromptInput
          value={inputValue}
          onChange={handleInputChange}
          onSubmit={() => void handleSubmit()}
          status={status}
          nonBlocking={nonBlocking}
          history={promptHistory}
          models={models}
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
          members={mentionMembers}
        />
      </div>
    </div>
  );
}
