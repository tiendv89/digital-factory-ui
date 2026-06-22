"use client";

import { ExternalLink, GitPullRequest } from "lucide-react";

type InitPRBannerProps = {
  initPrUrl?: string;
};

export function InitPRBanner({ initPrUrl }: InitPRBannerProps) {
  if (!initPrUrl) return null;

  return (
    <a
      href={initPrUrl}
      target="_blank"
      rel="noreferrer noopener"
      className="mt-1.5 flex items-center gap-1.5 rounded-md border border-primary/25 bg-primary/10 px-2.5 py-1.5 text-[11px] font-medium text-primary transition-colors hover:bg-primary/15"
      data-init-pr-banner
    >
      <GitPullRequest className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>View Init PR</span>
      <ExternalLink className="h-3 w-3 shrink-0 opacity-70" aria-hidden="true" />
    </a>
  );
}
