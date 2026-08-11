"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useSession } from "@/lib/session";
import GameCanvas, { type GameCanvasHandle } from "@/components/games/game-canvas";
import { GAME_ENGINES } from "@/lib/games/registry";
import { GAME_THEMES, useGameTheme } from "@/lib/games/theme";
import type { GameEngineState } from "@/lib/games/engine";
import type { CatalogGame } from "@/lib/games/catalog";

export default function GamePlayer({ game }: { game: CatalogGame }) {
  const { user, saveScore } = useSession();
  const engineFactory = GAME_ENGINES[game.id] as
    | (typeof GAME_ENGINES)[string]
    | undefined;
  const canvasHandleRef = useRef<GameCanvasHandle>(null);
  const [theme, setTheme] = useGameTheme();

  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [paused, setPaused] = useState(false);
  const [over, setOver] = useState(false);
  const [name, setName] = useState(user ? user.name : "INVITADO");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (engineFactory) return;
    if (over || paused) return;
    const t = setInterval(() => setScore((s) => s + Math.floor(10 + Math.random() * 90)), 220);
    return () => clearInterval(t);
  }, [engineFactory, over, paused]);

  useEffect(() => {
    if (engineFactory) return;
    if (score > 0 && score % 2500 < 100) setLevel((l) => l + 1);
  }, [engineFactory, score]);

  const handleEngineStateChange = (s: GameEngineState) => {
    setScore(s.score);
    setLives(s.lives);
    setLevel(s.level);
  };

  const handleEngineGameOver = (finalScore: number) => {
    setScore(finalScore);
    setOver(true);
  };

  const togglePause = () => {
    if (engineFactory) {
      if (paused) canvasHandleRef.current?.resume();
      else canvasHandleRef.current?.pause();
    }
    setPaused((p) => !p);
  };

  const endGame = () => {
    if (engineFactory) {
      canvasHandleRef.current?.forceGameOver();
      return;
    }
    setOver(true);
  };

  const restart = () => {
    if (engineFactory) {
      canvasHandleRef.current?.restart();
    } else {
      setScore(0);
      setLives(3);
      setLevel(1);
    }
    setPaused(false);
    setOver(false);
    setSaved(false);
    setSaving(false);
    setSaveError(null);
  };

  const handleSaveScore = async () => {
    setSaving(true);
    setSaveError(null);
    const { error } = await saveScore({ game: game.id, score, name });
    setSaving(false);
    if (error) {
      setSaveError(error);
      return;
    }
    setSaved(true);
  };

  return (
    <div className="av-player fade-in" data-theme={theme}>
      <div className="player-hud">
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div className="hud-stat">
            <div className="l">Jugador</div>
            <div className="v" style={{ color: "var(--ink)" }}>
              {name}
            </div>
          </div>
          <div className="hud-stat">
            <div className="l">Puntuación</div>
            <div className="v">{score.toLocaleString("es-ES")}</div>
          </div>
          <div className="hud-stat lives">
            <div className="l">Vidas</div>
            <div className="v">{"♥ ".repeat(lives).trim() || "—"}</div>
          </div>
          <div className="hud-stat level">
            <div className="l">Nivel</div>
            <div className="v">{String(level).padStart(2, "0")}</div>
          </div>
          <div className="hud-stat theme">
            <div className="l">Tema</div>
            <div className="hud-themes">
              {GAME_THEMES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={"chip" + (theme === t.id ? " active" : "")}
                  aria-pressed={theme === t.id}
                  onClick={() => setTheme(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="hud-actions">
          <button className="btn yellow" onClick={togglePause}>
            {paused ? "REANUDAR" : "PAUSA"}
          </button>
          <button className="btn magenta" onClick={endGame}>
            FIN
          </button>
          <Link className="btn ghost" href={`/juegos/${game.id}`}>
            SALIR
          </Link>
        </div>
      </div>

      <div className="crt">
        <div className="crt-screen">
          {engineFactory ? (
            <GameCanvas
              ref={canvasHandleRef}
              engineFactory={engineFactory}
              onStateChange={handleEngineStateChange}
              onGameOver={handleEngineGameOver}
              hideFocusOverlay={paused}
            />
          ) : (
            <div className="game-arena">
              <div className="grid-floor"></div>
              <div className="enemy e1"></div>
              <div className="enemy e2"></div>
              <div className="enemy e3"></div>
              <div className="player-ship"></div>
            </div>
          )}
          {paused && (
            <div className="crt-content" style={{ background: "rgba(0,0,0,0.6)", zIndex: 5 }}>
              <div>
                <div className="pixel neon-yellow" style={{ fontSize: 22 }}>
                  EN PAUSA
                </div>
                <div className="mono" style={{ fontSize: 11, color: "var(--ink-dim)", marginTop: 10, letterSpacing: "0.16em" }}>
                  PULSA REANUDAR PARA CONTINUAR
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="crt-bottom">
          <span className="led">SEÑAL OK</span>
          <span>{game.title} · CRT-83 · 60 HZ</span>
          <span>CARGA · 1MB</span>
        </div>
      </div>

      {over && (
        <div className="modal-bd">
          <div className="modal">
            <h2>FIN DEL JUEGO</h2>
            <div className="final-label">PUNTUACIÓN FINAL</div>
            <div className="final">{score.toLocaleString("es-ES")}</div>
            {!saved ? (
              <div className="input-row">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value.toUpperCase().slice(0, 10))}
                  placeholder="TUS INICIALES"
                />
                <button className="btn yellow" onClick={handleSaveScore} disabled={saving}>
                  {saving ? "GUARDANDO…" : "GUARDAR PUNTUACIÓN"}
                </button>
                {saveError && (
                  <div className="mono" style={{ fontSize: 11, color: "var(--magenta)", marginTop: 8 }}>
                    ▸ ERROR AL GUARDAR: {saveError}
                  </div>
                )}
              </div>
            ) : (
              <div className="toast-saved">▸ PUNTUACIÓN GUARDADA_</div>
            )}
            <div className="actions">
              <button className="btn" onClick={restart}>
                JUGAR DE NUEVO
              </button>
              <Link className="btn magenta" href="/biblioteca">
                VOLVER AL VAULT
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
