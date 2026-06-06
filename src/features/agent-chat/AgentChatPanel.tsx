"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createChatSession, streamChatTurn } from "@/services/workflow-backend/chat";
import { Conversation } from "./Conversation";
import { MessageThread } from "./MessageThread";
import { PromptInput } from "./PromptInput";
import type { ChatStatus, HermesMessage, ToolCallEntry } from "./types";

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
  const [messages, setMessages] = useState<HermesMessage[]>([]);
  const [status, setStatus] = useState<ChatStatus>("idle");
  const [inputValue, setInputValue] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [initError, setInitError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const msgIdCounter = useRef(0);

  const nextId = () => {
    msgIdCounter.current += 1;
    return `msg-${msgIdCounter.current}`;
  };

  useEffect(() => {
    let cancelled = false;
    setStatus("connecting");

    createChatSession(workspaceId, featureId, "anonymous")
      .then((r) => {
        if (!cancelled) {
          setSessionId(r.session_id);
          setStatus("idle");
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setInitError(err instanceof Error ? err.message : "Failed to connect to agent.");
          setStatus("error");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [workspaceId, featureId]);

  const handleSubmit = useCallback(() => {
    if (!sessionId || !inputValue.trim() || status === "connecting" || status === "streaming") {
      return;
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
      {
        workspaceId,
        featureId,
        sessionId,
        message: userMsg.content,
      },
      (event) => {
        if (event.type === "delta") {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: m.content + event.text } : m,
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
              ? { ...m, content: m.content || `Connection error: ${err.message}` }
              : m,
          ),
        );
        setStatus("error");
      },
    );
  }, [sessionId, inputValue, status, workspaceId, featureId, onArtifactSaved]);

  return (
    <div
      data-agent-chat-panel
      className="flex h-full flex-col bg-surface"
    >
      <div className="shrink-0 border-b border-border px-3 py-2">
        <span className="text-xs font-semibold text-text-secondary">Agent</span>
      </div>

      {initError ? (
        <div className="flex flex-1 items-center justify-center px-4 text-center">
          <p className="text-xs text-danger">{initError}</p>
        </div>
      ) : (
        <Conversation>
          <MessageThread messages={messages} status={status} />
        </Conversation>
      )}

      <PromptInput
        value={inputValue}
        onChange={setInputValue}
        onSubmit={handleSubmit}
        status={sessionId ? status : "connecting"}
      />
    </div>
  );
}
