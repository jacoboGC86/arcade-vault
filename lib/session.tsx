"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";

export interface SessionUser {
  name: string;
}

export interface ScoreEntry {
  game: string;
  score: number;
  name: string;
}

interface SessionContextValue {
  user: SessionUser | null;
  login: (u: SessionUser | null) => void;
  signOut: () => void;
  saveScore: (entry: ScoreEntry) => Promise<{ error: string | null }>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    try {
      setUser(JSON.parse(localStorage.getItem("av_user") || "null"));
    } catch {
      setUser(null);
    }
  }, []);

  const login = (u: SessionUser | null) => {
    setUser(u);
    localStorage.setItem("av_user", JSON.stringify(u));
  };

  const signOut = () => {
    setUser(null);
    localStorage.removeItem("av_user");
  };

  const saveScore = async (entry: ScoreEntry): Promise<{ error: string | null }> => {
    const supabase = createClient();
    const { error } = await supabase.from("scores").insert({
      game_id: entry.game,
      name: entry.name,
      score: entry.score,
    });
    return { error: error ? error.message : null };
  };

  return (
    <SessionContext.Provider value={{ user, login, signOut, saveScore }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}
