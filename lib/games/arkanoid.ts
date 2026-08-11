import type { GameEngine, GameEngineOptions, GameEngineState } from "./engine";
import { DEFAULT_GAME_THEME } from "./theme";
import { ARKANOID_THEMES } from "./themes/arkanoid-theme";

const W = 800;
const H = 600;

// 7 filas de bloques; el color de cada fila lo aporta la paleta del tema
// (`blockRows`), con la misma rotación por nivel que el original.
const BLOCK_ROWS = 7;
const BLOCK_COLS = 14;
const BLOCK_W = 54;
const BLOCK_H = 20;
const BLOCK_GAP = 2;
const BLOCK_SCORE = 10;
const BLOCK_OFFSET_X = (W - BLOCK_COLS * (BLOCK_W + BLOCK_GAP)) / 2;
const BLOCK_OFFSET_Y = 50;

// El original mueve la pelota/paleta por frame (asumiendo ~60fps); el motor
// aquí usa dt real en segundos, así que las velocidades se escalan ×60 para
// producir el mismo desplazamiento por segundo que el prototipo.
const BASE_BALL_SPEED = { dx: 180, dy: -180 };
const PADDLE_SPEED = 360;
const TOTAL_LEVELS = 3;

interface Paddle {
  x: number;
  y: number;
  w: number;
  h: number;
  speed: number;
}

interface Ball {
  x: number;
  y: number;
  dx: number;
  dy: number;
  radius: number;
  launched: boolean;
}

interface Block {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Índice (ya rotado por nivel) dentro de `palette.blockRows`. */
  colorIndex: number;
  alive: boolean;
}

function createBlocks(level: number): Block[] {
  const blocks: Block[] = [];
  const rotation = (level - 1) * 2;
  for (let row = 0; row < BLOCK_ROWS; row++) {
    for (let col = 0; col < BLOCK_COLS; col++) {
      blocks.push({
        x: BLOCK_OFFSET_X + col * (BLOCK_W + BLOCK_GAP),
        y: BLOCK_OFFSET_Y + row * (BLOCK_H + BLOCK_GAP),
        w: BLOCK_W,
        h: BLOCK_H,
        colorIndex: (row + rotation) % BLOCK_ROWS,
        alive: true,
      });
    }
  }
  return blocks;
}

export function createArkanoidEngine(
  canvas: HTMLCanvasElement,
  opts?: GameEngineOptions
): GameEngine {
  const ctx = canvas.getContext("2d")!;

  let palette = ARKANOID_THEMES[opts?.theme ?? DEFAULT_GAME_THEME];

  // ── Input ───────────────────────────────────────────────────────────────
  const keys: Record<string, boolean> = {};
  const justPressed: Record<string, boolean> = {};

  function pressed(code: string) {
    const val = justPressed[code];
    justPressed[code] = false;
    return val;
  }

  function onKeyDown(e: KeyboardEvent) {
    justPressed[e.code] = !keys[e.code];
    keys[e.code] = true;
    if (["Space", "ArrowLeft", "ArrowRight"].includes(e.code)) {
      e.preventDefault();
    }
  }

  function onKeyUp(e: KeyboardEvent) {
    keys[e.code] = false;
  }

  canvas.addEventListener("keydown", onKeyDown);
  canvas.addEventListener("keyup", onKeyUp);

  // ── Estado del juego (por instancia, dentro del closure) ─────────────────
  let paddle: Paddle;
  let ball: Ball;
  let blocks: Block[] = [];
  let score = 0;
  let lives = 3;
  let level = 1;
  let gameOverFired = false;

  let lastTime: number | null = null;
  let rafId: number | null = null;
  let running = false;

  let stateChangeCb: ((s: GameEngineState) => void) | null = null;
  let gameOverCb: ((finalScore: number) => void) | null = null;
  let lastEmitted: GameEngineState | null = null;

  function emitState() {
    if (
      lastEmitted &&
      lastEmitted.score === score &&
      lastEmitted.lives === lives &&
      lastEmitted.level === level
    ) {
      return;
    }
    lastEmitted = { score, lives, level };
    stateChangeCb?.(lastEmitted);
  }

  function createPaddle(): Paddle {
    return { x: W / 2 - 40.5, y: H - 40, w: 81, h: 14, speed: PADDLE_SPEED };
  }

  function resetBallOnPaddle() {
    ball.x = paddle.x + paddle.w / 2;
    ball.y = paddle.y - ball.radius;
    ball.dx = 0;
    ball.dy = 0;
    ball.launched = false;
  }

  function launchBall() {
    const speedMultiplier = 1.15 ** (level - 1);
    ball.dx = BASE_BALL_SPEED.dx * speedMultiplier;
    ball.dy = BASE_BALL_SPEED.dy * speedMultiplier;
    ball.launched = true;
  }

  function initGame() {
    paddle = createPaddle();
    ball = { x: 0, y: 0, dx: 0, dy: 0, radius: 8, launched: false };
    score = 0;
    lives = 3;
    level = 1;
    blocks = createBlocks(1);
    gameOverFired = false;
    resetBallOnPaddle();
    emitState();
  }

  function advanceLevel() {
    level++;
    blocks = createBlocks(level);
    resetBallOnPaddle();
  }

  function endGame() {
    if (gameOverFired) return;
    gameOverFired = true;
    stopLoop();
    gameOverCb?.(score);
  }

  // ── Update ────────────────────────────────────────────────────────────
  function updatePaddle(dt: number) {
    if (keys["ArrowLeft"]) paddle.x -= paddle.speed * dt;
    if (keys["ArrowRight"]) paddle.x += paddle.speed * dt;
    paddle.x = Math.max(0, Math.min(W - paddle.w, paddle.x));
  }

  function updateBall(dt: number) {
    if (!ball.launched) {
      ball.x = paddle.x + paddle.w / 2;
      ball.y = paddle.y - ball.radius;
      return;
    }

    ball.x += ball.dx * dt;
    ball.y += ball.dy * dt;

    if (ball.x - ball.radius <= 0) {
      ball.x = ball.radius;
      ball.dx = -ball.dx;
    } else if (ball.x + ball.radius >= W) {
      ball.x = W - ball.radius;
      ball.dx = -ball.dx;
    }

    if (ball.y - ball.radius <= 0) {
      ball.y = ball.radius;
      ball.dy = -ball.dy;
    }

    const hitsPaddle =
      ball.dy > 0 &&
      ball.x + ball.radius >= paddle.x &&
      ball.x - ball.radius <= paddle.x + paddle.w &&
      ball.y + ball.radius >= paddle.y &&
      ball.y - ball.radius <= paddle.y + paddle.h;

    if (hitsPaddle) {
      ball.y = paddle.y - ball.radius;
      ball.dy = -ball.dy;
    }

    if (ball.y - ball.radius > H) {
      lives -= 1;
      resetBallOnPaddle();
    }
  }

  function checkBlockCollision() {
    for (const block of blocks) {
      if (!block.alive) continue;

      const hits =
        ball.x + ball.radius >= block.x &&
        ball.x - ball.radius <= block.x + block.w &&
        ball.y + ball.radius >= block.y &&
        ball.y - ball.radius <= block.y + block.h;

      if (hits) {
        block.alive = false;
        score += BLOCK_SCORE;
        ball.dy = -ball.dy;
        break;
      }
    }
  }

  function update(dt: number) {
    if (pressed("Space") && !ball.launched) {
      launchBall();
    }

    updatePaddle(dt);
    updateBall(dt);

    if (lives <= 0) {
      endGame();
      return;
    }

    checkBlockCollision();

    if (blocks.every((block) => !block.alive)) {
      if (level < TOTAL_LEVELS) {
        advanceLevel();
      } else {
        endGame();
      }
    }
  }

  // ── Draw ──────────────────────────────────────────────────────────────
  function drawPaddle() {
    ctx.save();
    ctx.shadowColor = palette.paddle;
    ctx.shadowBlur = 12 * palette.glow;
    ctx.fillStyle = palette.paddle;
    ctx.fillRect(paddle.x, paddle.y, paddle.w, paddle.h);
    ctx.restore();
  }

  function drawBall() {
    ctx.save();
    ctx.shadowColor = palette.ball;
    ctx.shadowBlur = 10 * palette.glow;
    ctx.fillStyle = palette.ball;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawBlocks() {
    for (const block of blocks) {
      if (!block.alive) continue;
      const color = palette.blockRows[block.colorIndex];
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = 6 * palette.glow;
      ctx.fillStyle = color;
      ctx.fillRect(block.x, block.y, block.w, block.h);
      if (palette.blockStyle === "outline") {
        ctx.shadowBlur = 0;
        ctx.strokeStyle = palette.blockOutline;
        ctx.lineWidth = 2;
        ctx.strokeRect(block.x + 1, block.y + 1, block.w - 2, block.h - 2);
      }
      ctx.restore();
    }
  }

  function draw() {
    ctx.fillStyle = palette.background;
    ctx.fillRect(0, 0, W, H);

    drawBlocks();
    drawPaddle();
    drawBall();
  }

  // ── Loop principal ───────────────────────────────────────────────────
  function loop(ts: number) {
    const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
    lastTime = ts;
    update(dt);
    draw();
    emitState();
    if (running) {
      rafId = requestAnimationFrame(loop);
    } else {
      rafId = null;
    }
  }

  function startLoop() {
    running = true;
    lastTime = null;
    rafId = requestAnimationFrame(loop);
  }

  function stopLoop() {
    running = false;
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  return {
    start() {
      initGame();
      startLoop();
    },
    stop() {
      stopLoop();
    },
    pause() {
      stopLoop();
    },
    resume() {
      startLoop();
    },
    restart() {
      initGame();
      startLoop();
    },
    forceGameOver() {
      endGame();
    },
    onStateChange(cb) {
      stateChangeCb = cb;
    },
    onGameOver(cb) {
      gameOverCb = cb;
    },
    setTheme(theme) {
      palette = ARKANOID_THEMES[theme];
      // Con la partida en pausa no hay bucle: repintamos ya para que el
      // cambio de tema se vea al instante.
      if (!running) draw();
    },
  };
}
