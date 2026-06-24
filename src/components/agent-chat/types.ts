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
  /** Sender id (X-User-Id for humans) — resolved to a display name for channel view. */
  authorId?: string;
  /** Epoch seconds; used for the channel (Discord-style) timestamp. */
  createdAt?: number;
  /** Set to "stopped" when the agent turn was cancelled mid-stream by the user. */
  finishReason?: string;
  /** CTA suggestions attached to an assistant turn — populated from turn.cta_suggestions SSE event or history load. */
  ctaSuggestions?: CtaSuggestion[];
  /** Whether the CTA row for this message is still active (clickable). False for past turns. */
  ctaActive?: boolean;
};

export type ToolCallEntry = {
  callId: string;
  name: string;
  status: "running" | "done";
  output?: unknown;
};

export type ChatStatus = "idle" | "connecting" | "streaming" | "error";

export type CtaSuggestion = {
  id: string;
  title: string;
  category: "Lifecycle" | "Clarify" | "Review" | "Edit" | "Action" | "GitNexus" | "RAG";
  description: string;
  action_text: string;
  button_label: string;
  icon?: string;
};

export type WorkspaceCapabilities = {
  gitnexus: boolean;
  rag: boolean;
};

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
