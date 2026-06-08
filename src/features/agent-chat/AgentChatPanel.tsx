"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createChatSession,
  getSessionMessages,
  listChatSessions,
  streamChatTurn,
} from "@/services/workflow-backend/chat";
import type { ChatSessionSummary } from "@/services/workflow-backend/chat";
import { Conversation } from "./Conversation";
import { MessageThread } from "./MessageThread";
import { PromptInput } from "./PromptInput";
import { SessionHistoryList } from "./SessionHistoryList";
import { SlashCommandPicker } from "./slash-command-picker";
import type { ChatStatus, HermesMessage, ToolCallEntry } from "./types";

type PanelMode =
  | { mode: "history" }
  | { mode: "active"; sessionId: string; sessionTitle: string };

type AgentChatPanelProps = {
  workspaceId: string;
  featureId: string;
  onArtifactSaved?: (artifact: "product_spec" | "technical_design") => void;
};

export function AgentChatPanel({
  workspaceId,
  featureId,
  onArtifactSaved,
}: AgentChatPanelProps) {
  const [panelMode, setPanelMode] = useState<PanelMode>({ mode: "history" });
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [messages, setMessages] = useState<HermesMessage[]>([]);
  const [status, setStatus] = useState<ChatStatus>("idle");
  const [inputValue, setInputValue] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const msgIdCounter = useRef(0);

  const nextId = () => {
    msgIdCounter.current += 1;
    return `msg-${msgIdCounter.current}`;
  };

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

  const enterActiveMode = useCallback(
    (sessionId: string, sessionTitle: string) => {
      setMessages([]);
      setStatus("idle");
      setInputValue("");
      setPanelMode({ mode: "active", sessionId, sessionTitle });
    },
    [],
  );

  const handleSessionSelect = useCallback(
    async (id: string) => {
      const session = sessions.find((s) => s.id === id);
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
    [sessions, workspaceId, featureId],
  );

  const handleBack = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setPanelMode({ mode: "history" });
    setMessages([]);
    setStatus("idle");
    void fetchSessions();
  }, [fetchSessions]);

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

    if (panelMode.mode === "history") {
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
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: "assistant", content: "", toolCalls: [] },
    ]);

    abortRef.current = streamChatTurn(
      { workspaceId, featureId, sessionId, message: userMsg.content },
      (event) => {
        if (event.type === "delta") {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: m.content + event.text }
                : m,
            ),
          );
        } else if (event.type === "tool_start") {
          const toolEntry: ToolCallEntry = {
            callId: event.callId,
            name: event.name,
            status: "running",
          };
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, toolCalls: [...(m.toolCalls ?? []), toolEntry] }
                : m,
            ),
          );
        } else if (event.type === "tool_result") {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? {
                    ...m,
                    toolCalls: (m.toolCalls ?? []).map((tc) =>
                      tc.callId === event.callId
                        ? { ...tc, status: "done" as const, output: event.output }
                        : tc,
                    ),
                  }
                : m,
            ),
          );
        } else if (event.type === "artifact_saved") {
          onArtifactSaved?.(event.artifact);
        } else if (event.type === "error") {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: m.content || `Error: ${event.message}` }
                : m,
            ),
          );
          setStatus("error");
        }
      },
      () => {
        setStatus("idle");
      },
      (err) => {
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
    onArtifactSaved,
    enterActiveMode,
  ]);

  const isActive = panelMode.mode === "active";

  return (
    <div data-agent-chat-panel className="flex h-full flex-col bg-surface">
      {/* Header */}
      <div className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2">
        {isActive && (
          <button
            type="button"
            data-back-button
            onClick={handleBack}
            aria-label="Back to session history"
            className="shrink-0 text-text-secondary hover:text-text-primary"
          >
            ‹
          </button>
        )}
        <span className="truncate text-xs font-semibold text-text-secondary">
          {isActive && panelMode.mode === "active"
            ? panelMode.sessionTitle || "Agent"
            : "Agent"}
        </span>
      </div>

      {/* Body */}
      {isActive ? (
        <Conversation>
          <MessageThread messages={messages} status={status} />
        </Conversation>
      ) : (
        <SessionHistoryList
          sessions={sessions}
          loading={sessionsLoading}
          onSelect={handleSessionSelect}
        />
      )}

      {/* Input */}
      <div className="relative shrink-0">
        {pickerOpen && (
          <SlashCommandPicker
            query={inputValue}
            onSelect={handlePickerSelect}
            onClose={handlePickerClose}
          />
        )}
        <PromptInput
          value={inputValue}
          onChange={handleInputChange}
          onSubmit={() => void handleSubmit()}
          status={status}
        />
      </div>
    </div>
  );
}
