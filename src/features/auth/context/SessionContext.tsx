"use client";

import {
  createContext,
  useContext,
  useEffect,
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

  useEffect(() => {
    let cancelled = false;
    fetchMe()
      .then((data) => {
        if (cancelled) return;
        setSession({ status: "authenticated", data });
        if (pathname === "/login") {
          router.replace("/");
        }
      })
      .catch(() => {
        if (cancelled) return;
        setSession({ status: "unauthenticated" });
        if (pathname !== "/login") {
          router.replace("/login");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [router, pathname]);

  const logout = useCallback(async () => {
    await logoutUser();
    setSession({ status: "unauthenticated" });
    router.replace("/login");
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
