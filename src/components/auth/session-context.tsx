"use client";

import { usePathname, useRouter } from "next/navigation";
import { createContext, startTransition, useCallback, useContext, useEffect, useRef, useState } from "react";

import type { MeResponse } from "@/services/user-service";
import { fetchMe, logout as logoutUser } from "@/services/user-service";

type SessionState = { status: "loading" } | { status: "unauthenticated" } | { status: "authenticated"; data: MeResponse };

interface SessionContextValue {
  session: SessionState;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<SessionState>({ status: "loading" });
  const pathnameRef = useRef(pathname);
  const routerRef = useRef(router);
  useEffect(() => {
    pathnameRef.current = pathname;
    routerRef.current = router;
  }, [pathname, router]);

  useEffect(() => {
    let cancelled = false;
    fetchMe()
      .then((data) => {
        if (cancelled) return;
        setSession({ status: "authenticated", data });
        if (pathnameRef.current === "/login") {
          startTransition(() => routerRef.current.replace("/"));
        }
      })
      .catch(() => {
        if (cancelled) return;
        setSession({ status: "unauthenticated" });
        if (pathnameRef.current !== "/login") {
          startTransition(() => routerRef.current.replace("/login"));
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      const data = await fetchMe();
      setSession({ status: "authenticated", data });
    } catch {
      setSession({ status: "unauthenticated" });
      startTransition(() => router.replace("/login"));
    }
  }, [router]);

  const logout = useCallback(async () => {
    await logoutUser();
    setSession({ status: "unauthenticated" });
    startTransition(() => router.replace("/login"));
  }, [router]);

  return <SessionContext.Provider value={{ session, logout, refreshSession }}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return ctx;
}
