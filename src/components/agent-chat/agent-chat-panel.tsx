"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { ChatSessionSummary, ModelOption, ThreadEvent } from "@/services/hermes-agent/chat";
import { createChatSession, getSessionMessages, getThreadMessages, listChatSessions, listModels, sendThreadMessage, streamChatTurn, subscribeToThread } from "@/services/hermes-agent/chat";

import { Conversation } from "./conversation";
import { MessageThread } from "./message-thread";
import { PromptInput } from "./prompt-input";
import { SessionHistoryList } from "./session-history-list";
import { SlashCommandPicker } from "./slash-command-picker";
import type { ChatStatus, HermesMessage, ToolCallEntry } from "./types";

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
};

export function AgentChatPanel({ workspaceId, featureId, onArtifactSaved, onStageTransition, requestSessionId, newChatSignal, useSubscriptionTransport = false }: AgentChatPanelProps) {
  const [panelMode, setPanelMode] = useState<PanelMode>({ mode: "history" });
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [messages, setMessages] = useState<HermesMessage[]>([]);
  const [status, setStatus] = useState<ChatStatus>("idle");
  const [inputValue, setInputValue] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [models, setModels] = useState<ModelOption[]>([]);
  const [selectedModel, setSelectedModel] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const msgIdCounter = useRef(0);

  // Streaming deltas arrive token-by-token; applying each one immediately would
  // re-render the whole thread and re-parse the growing markdown on every token,
  // which visibly stutters. Instead we buffer incoming text and flush it once
  // per animation frame, so renders are capped at the display refresh rate.
  const deltaBufferRef = useRef<Map<string, string>>(new Map());
  const flushRafRef = useRef<number | null>(null);

  // Track the last seen message id for ?since= replay on reconnect.
  const lastMessageIdRef = useRef<string | null>(null);
  // Track the active subscription session id (for cleanup on session change).
  const subscriptionSessionRef = useRef<string | null>(null);
  // Track the streaming assistant message id for delta accumulation.
  const streamingAssistantIdRef = useRef<string | null>(null);
  // Stable ref to openSubscription so the onDone reconnect callback can call
  // the latest version without a stale closure.
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
      // graceful empty state on 404 or other errors
      setSessions([]);
    } finally {
      setSessionsLoading(false);
    }
  }, [workspaceId, featureId]);

  useEffect(() => {
    void fetchSessions();
  }, [fetchSessions]);

  // Load the model catalog once and default the selection to the server default.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { models: list, default: def } = await listModels();
        if (cancelled) return;
        setModels(list);
        setSelectedModel((cur) => cur || def || list[0]?.id || "");
      } catch {
        // graceful: leave the picker empty; the server falls back to its default.
      }
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

  // ─── Persistent subscription transport ──────────────────────────────────────

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

  const handleThreadEvent = useCallback(
    (event: ThreadEvent) => {
      if (event.type === "message.created") {
        const msg = event.message;
        lastMessageIdRef.current = msg.id;
        setMessages((prev) => {
          // Avoid duplicating a message optimistically added by handleSubmit
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        // If this is an assistant message arriving via stream, track it for deltas
        if (msg.role === "assistant") {
          streamingAssistantIdRef.current = msg.id;
          setStatus("streaming");
        }
      } else if (event.type === "delta") {
        const targetId = event.messageId || streamingAssistantIdRef.current;
        if (!targetId) return;
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
    [onArtifactSaved, scheduleFlush, finalizeStreamForMessage],
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
          // Stream closed cleanly — mark idle if no pending deltas
          setStatus((prev) => (prev === "streaming" ? "idle" : prev));
          // Reconnect with replay if the close wasn't intentional
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
  // Keep the ref in sync with the latest openSubscription so the onDone reconnect
  // callback can always call the current version without a stale closure.
  useEffect(() => {
    openSubscriptionRef.current = openSubscription;
  }, [openSubscription]);

  // ─── Session select / history load ──────────────────────────────────────────

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
      try {
        let history: HermesMessage[];
        if (useSubscriptionTransport) {
          history = await getThreadMessages(id);
        } else {
          history = await getSessionMessages(workspaceId, featureId, id);
        }
        setMessages(history);
        // Track last message id for reconnect replay
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

  // Abort the subscription when the component unmounts or the session changes.
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

  // ─── Submit ──────────────────────────────────────────────────────────────────

  const handleSubmit = useCallback(async () => {
    if (!inputValue.trim() || status === "connecting" || status === "streaming") {
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
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");

    if (useSubscriptionTransport) {
      // Send via POST; response (and any agent reply) arrive on the subscription.
      setStatus("streaming");
      try {
        const { message_id } = await sendThreadMessage(sessionId, userMsg.content);
        // Update the optimistic message's local counter ID to the server-assigned UUID
        // so the deduplication check in handleThreadEvent (m.id === msg.id) matches
        // and skips the duplicate when the message.created SSE event arrives.
        setMessages((prev) =>
          prev.map((m) => (m.id === userMsg.id ? { ...m, id: message_id } : m)),
        );
        // Status will be updated by the subscription event handler once the
        // message.created / agent.working / done events arrive.
      } catch {
        setStatus("error");
      }
      return;
    }

    // ── Legacy per-turn streaming (backward-compat) ──────────────────────────
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
  }, [inputValue, status, panelMode, workspaceId, featureId, selectedModel, onArtifactSaved, enterActiveMode, useSubscriptionTransport, openSubscription]);

  const isActive = panelMode.mode === "active";

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
          <MessageThread messages={messages} status={status} onStageTransition={onStageTransition} />
        </Conversation>
      ) : (
        <SessionHistoryList sessions={sessions} loading={sessionsLoading} onSelect={handleSessionSelect} />
      )}

      {/* Input */}
      <div className="relative shrink-0">
        {pickerOpen && <SlashCommandPicker query={inputValue} onSelect={handlePickerSelect} onClose={handlePickerClose} />}
        <PromptInput
          value={inputValue}
          onChange={handleInputChange}
          onSubmit={() => void handleSubmit()}
          status={status}
          history={promptHistory}
          models={models}
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
        />
      </div>
    </div>
  );
}
