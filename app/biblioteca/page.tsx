import LibraryBrowser from "@/components/library-browser";
import { getBestScores, getCatalogGames } from "@/lib/games/catalog";

export default async function Library() {
  const [games, bestScores] = await Promise.all([getCatalogGames(), getBestScores()]);
  const gamesWithBest = games.map((g) => ({ ...g, best: bestScores.get(g.id) ?? 0 }));

  return <LibraryBrowser games={gamesWithBest} />;
}
