export type MessageRole = "user" | "assistant";

export type HermesMessage = {
  id: string;
  role: MessageRole;
  content: string;
  toolCalls?: ToolCallEntry[];
};

export type ToolCallEntry = {
  callId: string;
  name: string;
  status: "running" | "done";
  output?: unknown;
};

export type ChatStatus = "idle" | "connecting" | "streaming" | "error";
