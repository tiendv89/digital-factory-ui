"use client";

import { Construction, Hash, Send } from "lucide-react";

type ChannelItem = {
  id: string;
  name: string;
};

const PLACEHOLDER_CHANNELS: ChannelItem[] = [
  { id: "ch-general", name: "general" },
  { id: "ch-design", name: "design" },
  { id: "ch-engineering", name: "engineering" },
  { id: "ch-releases", name: "releases" },
];

function PlaceholderBanner() {
  return (
    <div
      data-channels-banner
      className="flex items-center gap-2 border-b border-border bg-warning-bg px-4 py-2"
    >
      <Construction className="h-3.5 w-3.5 shrink-0 text-warning" aria-hidden />
      <p className="text-xs text-warning">
        <span className="font-semibold">Channels are not yet wired.</span>
        {" "}No backend exists — this is a placeholder view.
      </p>
    </div>
  );
}

export type FeatureIDEChannelsPaneProps = {
  channelId: string;
};

export function FeatureIDEChannelsPane({ channelId }: FeatureIDEChannelsPaneProps) {
  const channel = PLACEHOLDER_CHANNELS.find((c) => c.id === channelId);
  const channelName = channel ? channel.name : channelId;

  return (
    <div
      data-feature-ide-channels-pane
      className="flex h-full flex-col"
    >
      <PlaceholderBanner />

      {/* Channel header */}
      <div className="flex shrink-0 items-center gap-2 border-b border-border px-4 py-3">
        <Hash className="h-4 w-4 shrink-0 text-text-muted" aria-hidden />
        <span className="text-sm font-semibold text-text-primary">{channelName}</span>
        <span className="ml-2 rounded bg-chip-bg px-1.5 py-0.5 text-[10px] text-text-muted">
          placeholder
        </span>
      </div>

      {/* Message area — empty placeholder */}
      <div
        data-channels-message-area
        className="flex flex-1 flex-col items-center justify-center gap-3 px-4"
      >
        <Hash className="h-10 w-10 text-text-muted opacity-30" aria-hidden />
        <p className="text-sm font-medium text-text-secondary">#{channelName}</p>
        <p className="text-xs text-text-muted">
          Channel messaging is coming soon. No backend is wired yet.
        </p>
      </div>

      {/* Disabled composer */}
      <div
        data-channels-composer
        className="shrink-0 border-t border-border px-3 py-3"
      >
        <div className="flex items-end gap-2 rounded border border-border bg-surface-secondary px-3 py-2 opacity-50">
          <textarea
            disabled
            placeholder={`Message #${channelName} (coming soon)`}
            aria-label={`Message #${channelName}`}
            rows={1}
            className="flex-1 resize-none bg-transparent text-sm text-text-secondary placeholder:text-text-muted focus:outline-none disabled:cursor-not-allowed"
          />
          <button
            type="button"
            disabled
            aria-label="Send message"
            title="Send (not yet wired)"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-primary text-white opacity-40 cursor-not-allowed"
          >
            <Send className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
        <p className="mt-1 text-[10px] text-text-muted">
          Channels require a messaging backend — not yet implemented.
        </p>
      </div>
    </div>
  );
}

export { PLACEHOLDER_CHANNELS };
