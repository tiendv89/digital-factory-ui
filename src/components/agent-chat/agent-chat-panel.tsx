"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { ChatSessionSummary, ModelOption } from "@/services/hermes-agent/chat";
import { createChatSession, getSessionMessages, listChatSessions, listModels, streamChatTurn } from "@/services/hermes-agent/chat";

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
};

export function AgentChatPanel({ workspaceId, featureId, onArtifactSaved, onStageTransition, requestSessionId, newChatSignal }: AgentChatPanelProps) {
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
  const deltaBufferRef = useRef("");
  const flushRafRef = useRef<number | null>(null);

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

  const handleSessionSelect = useCallback(
    async (id: string) => {
      const session = sessions.find((s) => s.id === id);
      // Restore the session's last-used model when it's still a known option.
      if (session?.model && models.some((m) => m.id === session.model)) {
        setSelectedModel(session.model);
      }
      setMessages([]);
      setInputValue("");
      setPanelMode({ mode: "active", sessionId: id, sessionTitle: session?.title ?? "" });
      setStatus("connecting");
      try {
        const history = await getSessionMessages(workspaceId, featureId, id);
        setMessages(history);
        setStatus("idle");
      } catch {
        // graceful: show empty transcript if history can't be loaded
        setMessages([]);
        setStatus("idle");
      }
    },
    [sessions, workspaceId, featureId, models],
  );

  const requestedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!requestSessionId || requestSessionId === requestedRef.current) return;
    requestedRef.current = requestSessionId;
    void handleSessionSelect(requestSessionId);
  }, [requestSessionId, handleSessionSelect]);

  // Start a fresh conversation: drop the current transcript and enter an
  // active-but-sessionless state. A new session is created on the first message.
  const handleNewChat = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setMessages([]);
    setInputValue("");
    setPickerOpen(false);
    setStatus("idle");
    setPanelMode({ mode: "active", sessionId: "", sessionTitle: "" });
  }, []);

  // The parent header owns the "New chat" button; it bumps newChatSignal to ask
  // the panel to reset. Ignore the initial value so we don't reset on mount.
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
    setStatus("streaming");

    const assistantId = nextId();
    setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "", toolCalls: [] }]);

    const flushDelta = () => {
      flushRafRef.current = null;
      const text = deltaBufferRef.current;
      if (!text) return;
      deltaBufferRef.current = "";
      setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + text } : m)));
    };
    const scheduleFlush = () => {
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
          deltaBufferRef.current += event.text;
          scheduleFlush();
        } else if (event.type === "tool_start") {
          const toolEntry: ToolCallEntry = {
            callId: event.callId,
            name: event.name,
            status: "running",
          };
          // The backend can emit repeated "running" progress events for the
          // same callId. Append only on first sight; otherwise refresh the
          // existing entry in place so we never stack duplicate rows.
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
  }, [inputValue, status, panelMode, workspaceId, featureId, selectedModel, onArtifactSaved, enterActiveMode]);

  const isActive = panelMode.mode === "active";

  // Sent user prompts, newest first — used for CLI-style Up/Down history recall.
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
