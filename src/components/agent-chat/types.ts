type MessageRole = "user" | "assistant";

export type MessageAuthor = {
  id: string;
  name: string;
  avatarUrl?: string | null;
  roleLabel?: string | null;
};

export type HermesMessage = {
  id: string;
  role: MessageRole;
  content: string;
  toolCalls?: ToolCallEntry[];
  /** Attribution added by T6; absent on legacy messages from before the migration. */
  author?: MessageAuthor;
};

export type ToolCallEntry = {
  callId: string;
  name: string;
  status: "running" | "done";
  output?: unknown;
};

export type ChatStatus = "idle" | "connecting" | "streaming" | "error";
