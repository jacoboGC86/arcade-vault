import { notFound } from "next/navigation";
import GamePlayer from "@/components/game-player";
import { getCatalogGame } from "@/lib/games/catalog";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const game = await getCatalogGame(id);
  if (!game) notFound();

  return <GamePlayer game={game} />;
}
