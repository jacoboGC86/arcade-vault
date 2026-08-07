'use strict';

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

const RETRO_COLORS = [
  null,
  '#4dd0e1', '#ffd54f', '#ba68c8', '#81c784',
  '#e57373', '#64b5f6', '#ffb74d', '#ff5252', '#7c4dff',
];

const PIECES = [
  null,
  [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], // I
  [[2,2],[2,2]],                               // O
  [[0,3,0],[3,3,3],[0,0,0]],                  // T
  [[0,4,4],[4,4,0],[0,0,0]],                  // S
  [[5,5,0],[0,5,5],[0,0,0]],                  // Z
  [[6,0,0],[6,6,6],[0,0,0]],                  // J
  [[0,0,7],[7,7,7],[0,0,0]],                  // L
  [[8]],                                       // Bomb (rare)
  [[9]],                                       // Gravity power-up (timed)
];

const LINE_SCORES = [0, 100, 300, 500, 800];
const SPECIAL_PIECE_CHANCE = 0.08;
const GRAVITY_TYPE = 9;
const GRAVITY_INTERVAL = 20000;

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next-canvas');
const nextCtx = nextCanvas.getContext('2d');
const scoreEl = document.getElementById('score');
const linesEl = document.getElementById('lines');
const levelEl = document.getElementById('level');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayScore = document.getElementById('overlay-score');
const restartBtn = document.getElementById('restart-btn');
const themeToggleInput = document.getElementById('theme-toggle-input');
const pauseMenu = document.getElementById('pause-menu');
const resumeBtn = document.getElementById('resume-btn');
const pauseRestartBtn = document.getElementById('pause-restart-btn');
const toggleControlsBtn = document.getElementById('toggle-controls-btn');
const pauseControlsList = document.getElementById('pause-controls-list');
const startLevelSelect = document.getElementById('start-level-select');
const skinSelectInput = document.getElementById('skin-select');
const recordsListEl = document.getElementById('records-list');
const overlayRecordsListEl = document.getElementById('overlay-records-list');
const nameEntryEl = document.getElementById('name-entry');
const playerNameInput = document.getElementById('player-name-input');
const saveScoreBtn = document.getElementById('save-score-btn');
const resetRecordsBtn = document.getElementById('reset-records-btn');
const bestComboStatEl = document.getElementById('best-combo-stat');
const maxLinesStatEl = document.getElementById('max-lines-stat');

let board, current, next, score, lines, level, paused, gameOver, lastTime, dropAccum, dropInterval, animId, gravityAccum, gravityQueued, comboCount, bestCombo;

const THEME_STORAGE_KEY = 'tetris-theme';
const STARTING_LEVEL_KEY = 'tetris-start-level';
const RECORDS_STORAGE_KEY = 'tetris-records';
const BEST_STATS_KEY = 'tetris-best-stats';

let startLevel = parseInt(localStorage.getItem(STARTING_LEVEL_KEY), 10) || 1;
startLevelSelect.value = startLevel;

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  themeToggleInput.checked = theme === 'light';
  localStorage.setItem(THEME_STORAGE_KEY, theme);
}

function gridLineColor() {
  return getComputedStyle(document.documentElement).getPropertyValue('--grid-line').trim();
}

themeToggleInput.addEventListener('change', () => {
  applyTheme(themeToggleInput.checked ? 'light' : 'dark');
});

applyTheme(localStorage.getItem(THEME_STORAGE_KEY) || 'dark');

const SKIN_STORAGE_KEY = 'tetris-skin';

function applySkin(skinName) {
  const name = SKINS[skinName] ? skinName : 'retro';
  activeSkin = SKINS[name];
  document.documentElement.setAttribute('data-skin', name);
  skinSelectInput.value = name;
  localStorage.setItem(SKIN_STORAGE_KEY, name);
  if (next) drawNext();
}

skinSelectInput.addEventListener('change', () => applySkin(skinSelectInput.value));

function loadRecords() {
  try { return JSON.parse(localStorage.getItem(RECORDS_STORAGE_KEY)) || []; }
  catch { return []; }
}

function saveRecords(records) {
  localStorage.setItem(RECORDS_STORAGE_KEY, JSON.stringify(records));
}

function loadBestStats() {
  try { return JSON.parse(localStorage.getItem(BEST_STATS_KEY)) || { bestCombo: 0, maxLines: 0 }; }
  catch { return { bestCombo: 0, maxLines: 0 }; }
}

function saveBestStats(stats) {
  localStorage.setItem(BEST_STATS_KEY, JSON.stringify(stats));
}

function isTopScore(candidateScore) {
  const records = loadRecords();
  return records.length < 5 || candidateScore > records[records.length - 1].score;
}

function addRecord(name, runScore, runLines, runCombo) {
  const records = loadRecords();
  records.push({ name: name || 'AAA', score: runScore, lines: runLines, combo: runCombo });
  records.sort((a, b) => b.score - a.score);
  records.length = Math.min(records.length, 5);
  saveRecords(records);
  const best = loadBestStats();
  best.bestCombo = Math.max(best.bestCombo, runCombo);
  best.maxLines = Math.max(best.maxLines, runLines);
  saveBestStats(best);
  renderRecords();
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function renderRecordsInto(listEl, highlightScore) {
  const records = loadRecords();
  listEl.innerHTML = '';
  if (!records.length) {
    const li = document.createElement('li');
    li.textContent = 'Sin récords todavía';
    li.className = 'record-empty';
    listEl.appendChild(li);
    return;
  }
  records.forEach(r => {
    const li = document.createElement('li');
    li.className = 'record-entry';
    if (highlightScore != null && r.score === highlightScore) li.classList.add('record-highlight');
    li.innerHTML = `<span class="record-name">${escapeHtml(r.name)}</span><span class="record-score">${r.score.toLocaleString()}</span><span class="record-meta">L${r.lines} · C${r.combo}</span>`;
    listEl.appendChild(li);
  });
}

function renderRecords(highlightScore) {
  renderRecordsInto(recordsListEl, null);
  renderRecordsInto(overlayRecordsListEl, highlightScore);
  const best = loadBestStats();
  bestComboStatEl.textContent = best.bestCombo;
  maxLinesStatEl.textContent = best.maxLines;
}

function resetRecords() {
  localStorage.removeItem(RECORDS_STORAGE_KEY);
  localStorage.removeItem(BEST_STATS_KEY);
  renderRecords();
}

function createBoard() {
  return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
}

function randomPiece() {
  const type = Math.random() < SPECIAL_PIECE_CHANCE ? 8 : Math.floor(Math.random() * 7) + 1;
  const shape = PIECES[type].map(row => [...row]);
  return { type, shape, x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2), y: 0 };
}

function createGravityPiece() {
  const shape = PIECES[GRAVITY_TYPE].map(row => [...row]);
  return { type: GRAVITY_TYPE, shape, x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2), y: 0 };
}

function collide(shape, ox, oy) {
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

function rotateCW(shape) {
  const rows = shape.length, cols = shape[0].length;
  const result = Array.from({ length: cols }, () => new Array(rows).fill(0));
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      result[c][rows - 1 - r] = shape[r][c];
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
      if (current.shape[r][c])
        board[current.y + r][current.x + c] = current.shape[r][c];
}

function explode(cx, cy) {
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
    const values = [];
    for (let r = 0; r < ROWS; r++) {
      if (board[r][c]) values.push(board[r][c]);
    }
    for (let r = ROWS - 1; r >= 0; r--) {
      board[r][c] = values.length ? values.pop() : 0;
    }
  }
}

function clearLines() {
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r].every(v => v !== 0)) {
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
    updateHUD();
  } else {
    comboCount = 0;
  }
}

function ghostY() {
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
    updateHUD();
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
  drawNext();
}

function updateHUD() {
  scoreEl.textContent = score.toLocaleString();
  linesEl.textContent = lines;
  levelEl.textContent = level;
}

function drawBlockRetro(context, x, y, colorIndex, size, alpha) {
  const color = activeSkin.colors[colorIndex];
  context.globalAlpha = alpha;
  context.fillStyle = color;
  context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
  // highlight
  context.fillStyle = 'rgba(255,255,255,0.12)';
  context.fillRect(x * size + 1, y * size + 1, size - 2, 4);
  context.globalAlpha = 1;
}

function drawBlockNeon(context, x, y, colorIndex, size, alpha) {
  const color = activeSkin.colors[colorIndex];
  context.save();
  context.globalAlpha = alpha;
  context.shadowColor = color;
  context.shadowBlur = size * 0.5;
  context.fillStyle = color;
  context.fillRect(x * size + 3, y * size + 3, size - 6, size - 6);
  context.shadowBlur = 0;
  context.fillStyle = 'rgba(255,255,255,0.35)';
  context.fillRect(x * size + 3, y * size + 3, size - 6, 3);
  context.restore();
}

function roundRectPath(context, x, y, w, h, r) {
  context.moveTo(x + r, y);
  context.arcTo(x + w, y, x + w, y + h, r);
  context.arcTo(x + w, y + h, x, y + h, r);
  context.arcTo(x, y + h, x, y, r);
  context.arcTo(x, y, x + w, y, r);
  context.closePath();
}

function drawBlockPastel(context, x, y, colorIndex, size, alpha) {
  const color = activeSkin.colors[colorIndex];
  const px = x * size + 2, py = y * size + 2, s = size - 4;
  const r = Math.min(6, s / 2);
  context.globalAlpha = alpha;
  context.fillStyle = color;
  context.beginPath();
  if (context.roundRect) context.roundRect(px, py, s, s, r);
  else roundRectPath(context, px, py, s, s, r);
  context.fill();
  context.fillStyle = 'rgba(255,255,255,0.3)';
  context.beginPath();
  if (context.roundRect) context.roundRect(px, py, s, s * 0.35, [r, r, 0, 0]);
  else roundRectPath(context, px, py, s, s * 0.35, r);
  context.fill();
  context.globalAlpha = 1;
}

function shadeColor(hex, amt) {
  const num = parseInt(hex.slice(1), 16);
  let r = (num >> 16) + amt, g = ((num >> 8) & 0xff) + amt, b = (num & 0xff) + amt;
  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

function drawBlockPixel(context, x, y, colorIndex, size, alpha) {
  const color = activeSkin.colors[colorIndex];
  const px = x * size + 1, py = y * size + 1, s = size - 2;
  context.globalAlpha = alpha;
  context.fillStyle = color;
  context.fillRect(px, py, s, s);
  const cell = s / 4;
  context.fillStyle = shadeColor(color, -18);
  for (let ty = 0; ty < 4; ty++) {
    for (let tx = 0; tx < 4; tx++) {
      if ((tx + ty) % 2 === 0) continue;
      context.fillRect(px + tx * cell, py + ty * cell, cell, cell);
    }
  }
  context.strokeStyle = shadeColor(color, -35);
  context.lineWidth = 1;
  context.strokeRect(px + 0.5, py + 0.5, s - 1, s - 1);
  context.globalAlpha = 1;
}

const SKINS = {
  retro: {
    label: 'Retro',
    colors: RETRO_COLORS,
    boardBg: null,
    draw: drawBlockRetro,
  },
  neon: {
    label: 'Neon',
    colors: [
      null,
      '#00e5ff', '#fff176', '#e040fb', '#69f0ae',
      '#ff1744', '#40c4ff', '#ffab40', '#ff5252', '#d500f9',
    ],
    boardBg: '#000000',
    draw: drawBlockNeon,
  },
  pastel: {
    label: 'Pastel',
    colors: [
      null,
      '#a8ddf0', '#fff2b2', '#dcbdf0', '#bcead5',
      '#f6c6c6', '#b8d8f8', '#ffdcb0', '#ffb3b3', '#c9b8f5',
    ],
    boardBg: null,
    draw: drawBlockPastel,
  },
  pixel: {
    label: 'Pixel Art',
    colors: RETRO_COLORS,
    boardBg: null,
    draw: drawBlockPixel,
  },
};

let activeSkin = SKINS.retro;

applySkin(localStorage.getItem(SKIN_STORAGE_KEY) || 'retro');

function drawBlock(context, x, y, colorIndex, size, alpha) {
  if (!colorIndex) return;
  activeSkin.draw(context, x, y, colorIndex, size, alpha ?? 1);
}

function drawGrid() {
  ctx.strokeStyle = activeSkin.boardBg ? 'rgba(255,255,255,0.08)' : gridLineColor();
  ctx.lineWidth = 0.5;
  for (let c = 1; c < COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(c * BLOCK, 0);
    ctx.lineTo(c * BLOCK, ROWS * BLOCK);
    ctx.stroke();
  }
  for (let r = 1; r < ROWS; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * BLOCK);
    ctx.lineTo(COLS * BLOCK, r * BLOCK);
    ctx.stroke();
  }
}

function draw(ts) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (activeSkin.boardBg) {
    ctx.fillStyle = activeSkin.boardBg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  drawGrid();

  // board
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      drawBlock(ctx, c, r, board[r][c], BLOCK);

  // ghost
  const gy = ghostY();
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        drawBlock(ctx, current.x + c, gy + r, current.shape[r][c], BLOCK, 0.2);

  // current piece (blinks while it's the Gravity power-up)
  const currentAlpha = current.type === GRAVITY_TYPE
    ? 0.3 + 0.7 * Math.abs(Math.sin((ts ?? 0) / 150))
    : 1;
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      drawBlock(ctx, current.x + c, current.y + r, current.shape[r][c], BLOCK, currentAlpha);
}

function drawNext() {
  const NB = 30;
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  const shape = next.shape;
  const offX = Math.floor((4 - shape[0].length) / 2);
  const offY = Math.floor((4 - shape.length) / 2);
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++)
      drawBlock(nextCtx, offX + c, offY + r, shape[r][c], NB);
}

function endGame() {
  gameOver = true;
  cancelAnimationFrame(animId);
  overlayTitle.textContent = 'GAME OVER';
  overlayScore.textContent = `Puntuación: ${score.toLocaleString()} · Líneas: ${lines} · Combo: ${bestCombo}`;
  overlay.classList.remove('hidden');
  if (isTopScore(score)) {
    nameEntryEl.classList.remove('hidden');
    playerNameInput.value = '';
    renderRecords();
    setTimeout(() => playerNameInput.focus(), 0);
  } else {
    nameEntryEl.classList.add('hidden');
    renderRecords();
  }
}

function togglePause() {
  if (gameOver) return;
  paused = !paused;
  if (!paused) {
    pauseMenu.classList.add('hidden');
    lastTime = performance.now();
    loop(lastTime);
  } else {
    cancelAnimationFrame(animId);
    startLevelSelect.value = startLevel;
    pauseControlsList.classList.add('hidden');
    pauseMenu.classList.remove('hidden');
  }
}

function loop(ts) {
  const dt = ts - lastTime;
  lastTime = ts;
  dropAccum += dt;
  if (dropAccum >= dropInterval) {
    dropAccum = 0;
    if (!collide(current.shape, current.x, current.y + 1)) {
      current.y++;
    } else {
      lockPiece();
      if (gameOver) return;
    }
  }
  if (!gravityQueued) {
    gravityAccum += dt;
    if (gravityAccum >= GRAVITY_INTERVAL) {
      gravityAccum = 0;
      gravityQueued = true;
      next = createGravityPiece();
      drawNext();
    }
  }
  draw(ts);
  animId = requestAnimationFrame(loop);
}

function init() {
  board = createBoard();
  score = 0;
  lines = 0;
  level = startLevel;
  comboCount = 0;
  bestCombo = 0;
  paused = false;
  gameOver = false;
  dropInterval = Math.max(100, 1000 - (level - 1) * 90);
  dropAccum = 0;
  gravityAccum = 0;
  gravityQueued = false;
  lastTime = performance.now();
  next = randomPiece();
  spawn();
  updateHUD();
  overlay.classList.add('hidden');
  pauseMenu.classList.add('hidden');
  nameEntryEl.classList.add('hidden');
  renderRecords();
  cancelAnimationFrame(animId);
  animId = requestAnimationFrame(loop);
}

document.addEventListener('keydown', e => {
  if (e.code === 'KeyP' || e.code === 'Escape') { togglePause(); return; }
  if (paused || gameOver) return;
  switch (e.code) {
    case 'ArrowLeft':
      if (!collide(current.shape, current.x - 1, current.y)) current.x--;
      break;
    case 'ArrowRight':
      if (!collide(current.shape, current.x + 1, current.y)) current.x++;
      break;
    case 'ArrowDown':
      softDrop();
      break;
    case 'ArrowUp':
    case 'KeyX':
      tryRotate();
      break;
    case 'Space':
      e.preventDefault();
      hardDrop();
      break;
  }
  updateHUD();
});

restartBtn.addEventListener('click', init);

resumeBtn.addEventListener('click', () => {
  if (paused) togglePause();
});

pauseRestartBtn.addEventListener('click', init);

toggleControlsBtn.addEventListener('click', () => {
  pauseControlsList.classList.toggle('hidden');
});

startLevelSelect.addEventListener('change', () => {
  startLevel = parseInt(startLevelSelect.value, 10) || 1;
  localStorage.setItem(STARTING_LEVEL_KEY, startLevel);
});

saveScoreBtn.addEventListener('click', () => {
  addRecord(playerNameInput.value.trim().slice(0, 12), score, lines, bestCombo);
  nameEntryEl.classList.add('hidden');
  renderRecords(score);
});

playerNameInput.addEventListener('keydown', e => {
  if (e.code === 'Enter') saveScoreBtn.click();
});

resetRecordsBtn.addEventListener('click', () => {
  if (confirm('¿Borrar todos los récords?')) resetRecords();
});

init();
