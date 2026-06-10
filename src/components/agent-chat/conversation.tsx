"use client";

import { ArrowDown } from "lucide-react";
import { type ComponentProps, createContext, forwardRef, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

const NEAR_BOTTOM_THRESHOLD = 80;

interface ConversationContextValue {
  scrollRef: React.RefObject<HTMLDivElement | null>;
  isAtBottomRef: React.MutableRefObject<boolean>;
  isAtBottom: boolean;
  scrollToBottom: (behavior?: ScrollBehavior) => void;
}

const ConversationContext = createContext<ConversationContextValue | null>(null);

export function useConversationScroll() {
  const ctx = useContext(ConversationContext);
  if (!ctx) throw new Error("useConversationScroll must be used inside <Conversation>");
  return ctx;
}

export function Conversation({ children }: { children?: ReactNode }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const isAtBottomRef = useRef(true);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= NEAR_BOTTOM_THRESHOLD;
      if (atBottom !== isAtBottomRef.current) {
        isAtBottomRef.current = atBottom;
        setIsAtBottom(atBottom);
      }
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const value = useMemo(() => ({ scrollRef, isAtBottomRef, isAtBottom, scrollToBottom }), [isAtBottom, scrollToBottom]);

  return (
    <ConversationContext.Provider value={value}>
      <div data-conversation className="relative min-h-0 flex-1 overflow-hidden">
        <div ref={scrollRef} className="absolute inset-0 overflow-y-auto">
          {children}
        </div>
        {!isAtBottom && <ConversationScrollButton />}
      </div>
    </ConversationContext.Provider>
  );
}

export const ConversationContent = forwardRef<HTMLDivElement, ComponentProps<"div">>(({ className, ...props }, ref) => (
  <div ref={ref} className={`flex flex-col gap-3 px-3 py-3${className ? ` ${className}` : ""}`} {...props} />
));
ConversationContent.displayName = "ConversationContent";

function ConversationScrollButton() {
  const { scrollToBottom } = useConversationScroll();
  return (
    <button
      type="button"
      data-scroll-button
      onClick={() => scrollToBottom()}
      className="absolute bottom-4 right-4 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-border bg-surface shadow-sm transition-colors hover:bg-surface-subtle"
      aria-label="Scroll to bottom"
    >
      <ArrowDown className="h-3.5 w-3.5 text-text-secondary" aria-hidden="true" />
    </button>
  );
}
