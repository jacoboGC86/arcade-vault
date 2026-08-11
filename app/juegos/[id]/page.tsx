import Link from "next/link";
import { notFound } from "next/navigation";
import { getCatalogGame } from "@/lib/games/catalog";
import { createClient } from "@/lib/supabase/server";

export default async function GameDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const [game, { data }, { count: playsCount }] = await Promise.all([
    getCatalogGame(id),
    supabase
      .from("scores")
      .select("name, score, created_at")
      .eq("game_id", id)
      .order("score", { ascending: false })
      .limit(10),
    supabase.from("scores").select("*", { count: "exact", head: true }).eq("game_id", id),
  ]);
  if (!game) notFound();

  const scores = (data ?? []).map((r, i) => ({
    rank: i + 1,
    name: r.name,
    score: r.score,
    date: new Date(r.created_at).toLocaleDateString("es-ES"),
  }));
  const best = data?.[0]?.score;

  return (
    <div className="av-detail fade-in">
      <div>
        <div className="detail-cover">
          <div className={"cover-bg " + game.cover}></div>
        </div>
        <div style={{ marginTop: 20 }} className="detail-info">
          <div className="detail-tags">
            <span>{game.cat}</span>
            <span>1 JUGADOR</span>
            <span>TECLADO / TÁCTIL</span>
            <span>RETRO 1985</span>
          </div>
          <h2 className="neon-cyan">{game.title}</h2>
          <p>{game.long}</p>
          <div className="stat-strip">
            <div>
              <div className="l">Partidas</div>
              <div className="v">{(playsCount ?? 0).toLocaleString("es-ES")}</div>
            </div>
            <div>
              <div className="l">Mejor global</div>
              <div className="v" style={{ color: "var(--magenta)", textShadow: "0 0 6px rgba(255,0,110,0.5)" }}>
                {best !== undefined ? best.toLocaleString("es-ES") : "—"}
              </div>
            </div>
            <div>
              <div className="l">Dificultad</div>
              <div className="v" style={{ color: "var(--yellow)", textShadow: "0 0 6px rgba(245,255,0,0.5)" }}>
                ★ ★ ★ ☆ ☆
              </div>
            </div>
          </div>
          <div className="detail-actions">
            <Link className="btn xl pulse" href={`/jugar/${game.id}`}>
              ▶  JUGAR AHORA
            </Link>
            <Link className="btn ghost lg" href="/biblioteca">
              VOLVER AL VAULT
            </Link>
          </div>
        </div>
      </div>

      <aside>
        <div className="leaderboard">
          <h3>MEJORES PUNTUACIONES</h3>
          {scores.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 0" }} className="mono">
              AÚN NO HAY PUNTUACIONES PARA ESTE JUEGO
            </div>
          ) : (
            scores.map((r, i) => (
              <div key={r.name} className={"lb-row" + (i === 0 ? " top1" : i === 1 ? " top2" : i === 2 ? " top3" : "")}>
                <div className="rk">#{String(r.rank).padStart(2, "0")}</div>
                <div className="pl">
                  {r.name}
                  <div style={{ fontSize: 10, color: "var(--ink-faint)", letterSpacing: "0.1em" }}>{r.date}</div>
                </div>
                <div className="sc">{r.score.toLocaleString("es-ES")}</div>
              </div>
            ))
          )}
        </div>
      </aside>
    </div>
  );
}
