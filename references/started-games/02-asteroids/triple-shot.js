'use strict';

// ── Constantes del disparo triple ────────────────────────────────────────────
const TRIPLE_SHOT_DURATION = 10;     // segundos
const TRIPLE_SHOT_DROP_CHANCE = 0.08; // probabilidad de soltar power-up

// ── TriplePowerUp (cuadrado rojo parpadeante) ────────────────────────────────
class TriplePowerUp {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = POWERUP_RADIUS;
    this.ttl = POWERUP_TTL;
    this.dead = false;
  }

  update(dt) {
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    // Parpadeo según tiempo
    const blink = Math.sin(this.ttl * Math.PI * 2) * 0.5 + 0.5;
    if (blink < 0.3) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(Math.PI / 4); // 45° para que sea un diamante
    ctx.strokeStyle = '#f00';
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.7 + blink * 0.3;

    // Cuadrado
    ctx.strokeRect(-this.radius, -this.radius, this.radius * 2, this.radius * 2);

    ctx.restore();
  }

  activate(ship) {
    activateTripleShot(ship);
  }
}

// ── Funciones del disparo triple ─────────────────────────────────────────────
function trySpawnTriplePowerUp(x, y) {
  if (Math.random() < TRIPLE_SHOT_DROP_CHANCE) {
    powerUps.push(new TriplePowerUp(x, y));
  }
}

function activateTripleShot(ship) {
  ship.tripleShotActive = true;
  ship.tripleShotTimer = TRIPLE_SHOT_DURATION;
}

function updateTripleShot(ship, dt) {
  if (ship.tripleShotActive) {
    ship.tripleShotTimer -= dt;
    if (ship.tripleShotTimer <= 0) {
      ship.tripleShotActive = false;
    }
  }
}

function drawTripleShot(ship) {
  if (!ship.tripleShotActive) return;

  const remaining = ship.tripleShotTimer / TRIPLE_SHOT_DURATION;
  const alpha = 0.3 + remaining * 0.2;

  ctx.save();
  ctx.strokeStyle = `rgba(255, 0, 0, ${alpha})`;
  ctx.lineWidth = 1.5;
  ctx.globalAlpha = alpha;

  // Cuadrado rotado alrededor de la nave
  ctx.translate(ship.x, ship.y);
  ctx.rotate(Math.PI / 4);
  ctx.strokeRect(-ship.radius - 10, -ship.radius - 10, (ship.radius + 10) * 2, (ship.radius + 10) * 2);

  ctx.restore();
}
