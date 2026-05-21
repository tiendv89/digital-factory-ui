"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getLocalWorkspaceSummaries } from "@/services/local-workspace-store";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    const summaries = getLocalWorkspaceSummaries();
    if (summaries.length > 0) {
      router.replace("/board");
    } else {
      router.replace("/board");
    }
  }, [router]);

  return null;
}
