import type { GameEngine, GameEngineOptions, GameEngineState } from "./engine";
import { DEFAULT_GAME_THEME } from "./theme";
import { TETRIS_THEMES } from "./themes/tetris-theme";

export interface TetrisEngineState extends GameEngineState {
  lines: number;
  bestCombo: number;
}

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

const BOARD_X = 0;
const BOARD_Y = 0;

const PREVIEW_X = 340;
const PREVIEW_Y = 20;
const PREVIEW_SIZE = 120; // 4x4 celdas de BLOCK

type Shape = number[][];

const PIECES: (Shape | null)[] = [
  null,
  [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ], // I
  [
    [2, 2],
    [2, 2],
  ], // O
  [
    [0, 3, 0],
    [3, 3, 3],
    [0, 0, 0],
  ], // T
  [
    [0, 4, 4],
    [4, 4, 0],
    [0, 0, 0],
  ], // S
  [
    [5, 5, 0],
    [0, 5, 5],
    [0, 0, 0],
  ], // Z
  [
    [6, 0, 0],
    [6, 6, 6],
    [0, 0, 0],
  ], // J
  [
    [0, 0, 7],
    [7, 7, 7],
    [0, 0, 0],
  ], // L
  [[8]], // Bomba (rara)
  [[9]], // Power-up de gravedad (temporizado)
];

const LINE_SCORES = [0, 100, 300, 500, 800];
const SPECIAL_PIECE_CHANCE = 0.08;
const GRAVITY_TYPE = 9;
const GRAVITY_INTERVAL = 20000;

interface Piece {
  type: number;
  shape: Shape;
  x: number;
  y: number;
}

export function createTetrisEngine(
  canvas: HTMLCanvasElement,
  opts?: GameEngineOptions
): GameEngine {
  const ctx = canvas.getContext("2d")!;

  let palette = TETRIS_THEMES[opts?.theme ?? DEFAULT_GAME_THEME];

  // ── Estado del juego (por instancia, dentro del closure) ─────────────────
  let board: number[][] = [];
  let current: Piece;
  let next: Piece;
  let score = 0;
  let lines = 0;
  let level = 1;
  let comboCount = 0;
  let bestCombo = 0;
  let dropAccum = 0;
  let dropInterval = 1000;
  let gravityAccum = 0;
  let gravityQueued = false;

  let lastTime: number | null = null;
  let rafId: number | null = null;
  let running = false;
  let gameOverFired = false;

  let stateChangeCb: ((s: GameEngineState) => void) | null = null;
  let gameOverCb: ((finalScore: number) => void) | null = null;
  let lastEmitted: TetrisEngineState | null = null;

  function emitState() {
    if (
      lastEmitted &&
      lastEmitted.score === score &&
      lastEmitted.lives === (gameOverFired ? 0 : 1) &&
      lastEmitted.level === level &&
      lastEmitted.lines === lines &&
      lastEmitted.bestCombo === bestCombo
    ) {
      return;
    }
    lastEmitted = { score, lives: gameOverFired ? 0 : 1, level, lines, bestCombo };
    stateChangeCb?.(lastEmitted);
  }

  // ── Input ─────────────────────────────────────────────────────────────
  function onKeyDown(e: KeyboardEvent) {
    if (["ArrowLeft", "ArrowRight", "ArrowDown", "ArrowUp", "Space", "KeyX"].includes(e.code)) {
      e.preventDefault();
    }
    if (!running || gameOverFired) return;
    switch (e.code) {
      case "ArrowLeft":
        if (!collide(current.shape, current.x - 1, current.y)) current.x--;
        break;
      case "ArrowRight":
        if (!collide(current.shape, current.x + 1, current.y)) current.x++;
        break;
      case "ArrowDown":
        softDrop();
        break;
      case "ArrowUp":
      case "KeyX":
        tryRotate();
        break;
      case "Space":
        hardDrop();
        break;
    }
    emitState();
  }

  canvas.addEventListener("keydown", onKeyDown);

  // ── Lógica del tablero y piezas ──────────────────────────────────────
  function createBoard(): number[][] {
    return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
  }

  function randomPiece(): Piece {
    const type = Math.random() < SPECIAL_PIECE_CHANCE ? 8 : Math.floor(Math.random() * 7) + 1;
    const shape = PIECES[type]!.map((row) => [...row]);
    return { type, shape, x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2), y: 0 };
  }

  function createGravityPiece(): Piece {
    const shape = PIECES[GRAVITY_TYPE]!.map((row) => [...row]);
    return {
      type: GRAVITY_TYPE,
      shape,
      x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2),
      y: 0,
    };
  }

  function collide(shape: Shape, ox: number, oy: number): boolean {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;
        const nx = ox + c;
        const ny = oy + r;
        if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
        if (ny >= 0 && board[ny][nx]) return true;
      }
    }
    return false;
  }

  function rotateCW(shape: Shape): Shape {
    const rows = shape.length;
    const cols = shape[0].length;
    const result = Array.from({ length: cols }, () => new Array(rows).fill(0));
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) result[c][rows - 1 - r] = shape[r][c];
    return result;
  }

  function tryRotate() {
    const rotated = rotateCW(current.shape);
    const kicks = [0, -1, 1, -2, 2];
    for (const kick of kicks) {
      if (!collide(rotated, current.x + kick, current.y)) {
        current.shape = rotated;
        current.x += kick;
        return;
      }
    }
  }

  function merge() {
    for (let r = 0; r < current.shape.length; r++)
      for (let c = 0; c < current.shape[r].length; c++)
        if (current.shape[r][c]) board[current.y + r][current.x + c] = current.shape[r][c];
  }

  function explode(cx: number, cy: number) {
    for (let r = cy - 1; r <= cy + 1; r++) {
      if (r < 0 || r >= ROWS) continue;
      for (let c = cx - 1; c <= cx + 1; c++) {
        if (c < 0 || c >= COLS) continue;
        board[r][c] = 0;
      }
    }
  }

  function compactGaps() {
    for (let c = 0; c < COLS; c++) {
      const values: number[] = [];
      for (let r = 0; r < ROWS; r++) {
        if (board[r][c]) values.push(board[r][c]);
      }
      for (let r = ROWS - 1; r >= 0; r--) {
        board[r][c] = values.length ? values.pop()! : 0;
      }
    }
  }

  function clearLines() {
    let cleared = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (board[r].every((v) => v !== 0)) {
        board.splice(r, 1);
        board.unshift(new Array(COLS).fill(0));
        cleared++;
        r++;
      }
    }
    if (cleared) {
      comboCount++;
      bestCombo = Math.max(bestCombo, comboCount);
      lines += cleared;
      score += (LINE_SCORES[cleared] || 0) * level;
      level = Math.floor(lines / 10) + 1;
      dropInterval = Math.max(100, 1000 - (level - 1) * 90);
    } else {
      comboCount = 0;
    }
  }

  function ghostY(): number {
    let gy = current.y;
    while (!collide(current.shape, current.x, gy + 1)) gy++;
    return gy;
  }

  function hardDrop() {
    const gy = ghostY();
    score += (gy - current.y) * 2;
    current.y = gy;
    lockPiece();
  }

  function softDrop() {
    if (!collide(current.shape, current.x, current.y + 1)) {
      current.y++;
      score += 1;
    } else {
      lockPiece();
    }
  }

  function lockPiece() {
    if (current.type === 8) {
      explode(current.x, current.y);
    } else if (current.type === GRAVITY_TYPE) {
      compactGaps();
    } else {
      merge();
    }
    clearLines();
    spawn();
  }

  function spawn() {
    current = next;
    next = randomPiece();
    gravityQueued = false;
    if (collide(current.shape, current.x, current.y)) {
      endGame();
    }
  }

  // ── Draw ──────────────────────────────────────────────────────────────
  function drawCell(px: number, py: number, colorIndex: number, size: number, alpha = 1) {
    if (!colorIndex) return;
    const color = palette.pieces[colorIndex]!;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.shadowColor = color;
    ctx.shadowBlur = size * palette.glow;
    ctx.fillStyle = color;
    ctx.fillRect(px + 3, py + 3, size - 6, size - 6);
    ctx.shadowBlur = 0;
    switch (palette.cellStyle) {
      case "bevel":
        ctx.fillStyle = palette.bevel;
        ctx.fillRect(px + 3, py + 3, size - 6, 3);
        break;
      case "outline":
        ctx.strokeStyle = palette.outline;
        ctx.lineWidth = 2;
        ctx.strokeRect(px + 4, py + 4, size - 8, size - 8);
        break;
      case "flat":
        break;
    }
    ctx.restore();
  }

  function drawGrid() {
    ctx.strokeStyle = palette.grid;
    ctx.lineWidth = 0.5;
    for (let c = 1; c < COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(BOARD_X + c * BLOCK, BOARD_Y);
      ctx.lineTo(BOARD_X + c * BLOCK, BOARD_Y + ROWS * BLOCK);
      ctx.stroke();
    }
    for (let r = 1; r < ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(BOARD_X, BOARD_Y + r * BLOCK);
      ctx.lineTo(BOARD_X + COLS * BLOCK, BOARD_Y + r * BLOCK);
      ctx.stroke();
    }
  }

  function drawNextPreview() {
    ctx.strokeStyle = palette.previewFrame;
    ctx.lineWidth = 1;
    ctx.strokeRect(PREVIEW_X, PREVIEW_Y, PREVIEW_SIZE, PREVIEW_SIZE);

    const shape = next.shape;
    const offX = Math.floor((4 - shape[0].length) / 2);
    const offY = Math.floor((4 - shape.length) / 2);
    for (let r = 0; r < shape.length; r++)
      for (let c = 0; c < shape[r].length; c++)
        drawCell(
          PREVIEW_X + (offX + c) * BLOCK,
          PREVIEW_Y + (offY + r) * BLOCK,
          shape[r][c],
          BLOCK
        );
  }

  function draw(ts: number) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = palette.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawGrid();

    // tablero
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++)
        drawCell(BOARD_X + c * BLOCK, BOARD_Y + r * BLOCK, board[r][c], BLOCK);

    // ghost
    const gy = ghostY();
    for (let r = 0; r < current.shape.length; r++)
      for (let c = 0; c < current.shape[r].length; c++)
        if (current.shape[r][c])
          drawCell(
            BOARD_X + (current.x + c) * BLOCK,
            BOARD_Y + (gy + r) * BLOCK,
            current.shape[r][c],
            BLOCK,
            palette.ghostAlpha
          );

    // pieza actual (parpadea mientras es el power-up de Gravedad)
    const currentAlpha =
      current.type === GRAVITY_TYPE ? 0.3 + 0.7 * Math.abs(Math.sin(ts / 150)) : 1;
    for (let r = 0; r < current.shape.length; r++)
      for (let c = 0; c < current.shape[r].length; c++)
        drawCell(
          BOARD_X + (current.x + c) * BLOCK,
          BOARD_Y + (current.y + r) * BLOCK,
          current.shape[r][c],
          BLOCK,
          currentAlpha
        );

    drawNextPreview();
  }

  // ── Ciclo de juego ────────────────────────────────────────────────────
  function endGame() {
    if (gameOverFired) return;
    gameOverFired = true;
    stopLoop();
    emitState();
    gameOverCb?.(score);
  }

  function initGame() {
    board = createBoard();
    score = 0;
    lines = 0;
    level = 1;
    comboCount = 0;
    bestCombo = 0;
    dropInterval = Math.max(100, 1000 - (level - 1) * 90);
    dropAccum = 0;
    gravityAccum = 0;
    gravityQueued = false;
    gameOverFired = false;
    next = randomPiece();
    spawn();
    emitState();
  }

  function loop(ts: number) {
    const dt = lastTime === null ? 0 : ts - lastTime;
    lastTime = ts;

    dropAccum += dt;
    if (dropAccum >= dropInterval) {
      dropAccum = 0;
      if (!collide(current.shape, current.x, current.y + 1)) {
        current.y++;
      } else {
        lockPiece();
        if (gameOverFired) {
          rafId = null;
          return;
        }
      }
    }

    if (!gravityQueued) {
      gravityAccum += dt;
      if (gravityAccum >= GRAVITY_INTERVAL) {
        gravityAccum = 0;
        gravityQueued = true;
        next = createGravityPiece();
      }
    }

    draw(ts);
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
  };
}
