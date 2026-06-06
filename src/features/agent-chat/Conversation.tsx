"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowDown } from "lucide-react";

type ConversationProps = {
  children: ReactNode;
};

export function ConversationScrollButton({
  onClick,
}: {
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      data-scroll-button
      onClick={onClick}
      className="absolute bottom-4 right-4 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-border bg-surface shadow-sm transition-colors hover:bg-surface-subtle"
      aria-label="Scroll to bottom"
    >
      <ArrowDown className="h-3.5 w-3.5 text-text-secondary" aria-hidden="true" />
    </button>
  );
}

export function ConversationContent({
  children,
  scrollRef,
}: {
  children: ReactNode;
  scrollRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div
      data-conversation-content
      ref={scrollRef}
      className="flex flex-1 flex-col overflow-y-auto"
    >
      {children}
    </div>
  );
}

export function Conversation({ children }: ConversationProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  function scrollToBottom() {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    function handleScroll() {
      if (!el) return;
      const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      setShowScrollBtn(distFromBottom > 80);
    }

    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  // Auto-scroll when content updates
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distFromBottom < 120) {
      scrollToBottom();
    }
  });

  return (
    <div
      data-conversation
      className="relative flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      <ConversationContent scrollRef={scrollRef}>
        {children}
      </ConversationContent>
      {showScrollBtn && (
        <ConversationScrollButton onClick={scrollToBottom} />
      )}
    </div>
  );
}
