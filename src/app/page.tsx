"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getWorkspace } from "@/services/workspace-store";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    const workspace = getWorkspace();
    if (workspace) {
      router.replace("/board");
    } else {
      router.replace("/connect");
    }
  }, [router]);

  return null;
}
