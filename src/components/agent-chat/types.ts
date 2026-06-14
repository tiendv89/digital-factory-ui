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

/** A thread member — either a human workspace member or the `@agent` sentinel. */
export type ThreadMember = {
  id: string;
  /** Display name shown in the picker. */
  name: string;
  /** Unique handle used as the `@handle` token in message text. */
  handle: string;
  avatarUrl?: string | null;
  roleLabel?: string | null;
  kind: "user" | "agent";
};
