import { createClient } from "@/lib/supabase/server";
import type { GameCategory, GameColor } from "@/lib/data";

export interface CatalogGame {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: GameCategory;
  cover: string;
  color: GameColor;
}

export interface CatalogGameWithBest extends CatalogGame {
  best: number;
}

function toCatalogGame(row: {
  id: string;
  title: string;
  short: string | null;
  long: string | null;
  cat: string | null;
  cover: string | null;
  color: string | null;
}): CatalogGame | null {
  if (!row.short || !row.long || !row.cat || !row.cover || !row.color) return null;
  return {
    id: row.id,
    title: row.title,
    short: row.short,
    long: row.long,
    cat: row.cat as GameCategory,
    cover: row.cover,
    color: row.color as GameColor,
  };
}

export async function getCatalogGames(): Promise<CatalogGame[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("games").select("*").order("title");
  return (data ?? [])
    .map(toCatalogGame)
    .filter((g): g is CatalogGame => g !== null);
}

export async function getCatalogGame(id: string): Promise<CatalogGame | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("games").select("*").eq("id", id).maybeSingle();
  return data ? toCatalogGame(data) : null;
}

export async function getBestScores(): Promise<Map<string, number>> {
  const supabase = await createClient();
  const { data } = await supabase.from("scores").select("game_id, score");
  const best = new Map<string, number>();
  for (const row of data ?? []) {
    const current = best.get(row.game_id) ?? 0;
    if (row.score > current) best.set(row.game_id, row.score);
  }
  return best;
}
