"use client";

import React, { useState, useRef } from "react";

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  /** Tooltip position relative to trigger. Default: "top" */
  position?: "top" | "bottom" | "left" | "right";
}

const POSITION_STYLES: Record<string, string> = {
  top: "bottom-full left-1/2 -translate-x-1/2 mb-1.5",
  bottom: "top-full left-1/2 -translate-x-1/2 mt-1.5",
  left: "right-full top-1/2 -translate-y-1/2 mr-1.5",
  right: "left-full top-1/2 -translate-y-1/2 ml-1.5",
};

const ARROW_STYLES: Record<string, string> = {
  top: "-bottom-1 left-1/2 -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-t-gray-800 border-l-transparent border-r-transparent",
  bottom: "-top-1 left-1/2 -translate-x-1/2 border-l-4 border-r-4 border-b-4 border-b-gray-800 border-l-transparent border-r-transparent",
  left: "-right-1 top-1/2 -translate-y-1/2 border-t-4 border-b-4 border-l-4 border-l-gray-800 border-t-transparent border-b-transparent",
  right: "-left-1 top-1/2 -translate-y-1/2 border-t-4 border-b-4 border-r-4 border-r-gray-800 border-t-transparent border-b-transparent",
};

export function Tooltip({ content, children, position = "top" }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const show = () => {
    clearTimeout(timeoutRef.current);
    setVisible(true);
  };

  const hide = () => {
    timeoutRef.current = setTimeout(() => setVisible(false), 150);
  };

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {visible && (
        <div
          role="tooltip"
          className={`pointer-events-none absolute z-50 whitespace-nowrap rounded-md bg-gray-800 px-2.5 py-1.5 text-xs leading-relaxed text-white shadow-lg ${POSITION_STYLES[position]}`}
        >
          {content}
          <div
            className={`absolute size-0 border-solid ${ARROW_STYLES[position]}`}
          />
        </div>
      )}
    </div>
  );
}
