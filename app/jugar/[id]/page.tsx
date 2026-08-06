import { notFound } from "next/navigation";
import GamePlayer from "@/components/game-player";
import { GAMES } from "@/lib/data";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const game = GAMES.find((g) => g.id === id);
  if (!game) notFound();

  return <GamePlayer game={game} />;
}
