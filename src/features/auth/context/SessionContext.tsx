"use client";

import {
  createContext,
  startTransition,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import { fetchMe, logout as logoutUser } from "@/services/user-service";
import type { MeResponse } from "@/services/user-service";

type SessionState =
  | { status: "loading" }
  | { status: "unauthenticated" }
  | { status: "authenticated"; data: MeResponse };

interface SessionContextValue {
  session: SessionState;
  logout: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<SessionState>({ status: "loading" });

  // Refs let the bootstrap effect read the latest pathname/router without
  // re-firing on every navigation. Re-running fetchMe on pathname changes
  // creates a render→redirect→render storm in Next 16 (RSC prefetch flood).
  const pathnameRef = useRef(pathname);
  const routerRef = useRef(router);
  useEffect(() => {
    pathnameRef.current = pathname;
    routerRef.current = router;
  }, [pathname, router]);

  useEffect(() => {
    let cancelled = false;
    fetchMe()
        .then((data) => data.data)
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

  const logout = useCallback(async () => {
    await logoutUser();
    setSession({ status: "unauthenticated" });
    startTransition(() => router.replace("/login"));
  }, [router]);

  return (
    <SessionContext.Provider value={{ session, logout }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return ctx;
}
