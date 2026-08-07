'use strict';

// ── Constantes del escudo temporal ────────────────────────────────────────
const SHIELD_DURATION = 5;      // segundos
const SHIELD_DROP_CHANCE = 0.08; // probabilidad de soltar power-up
const POWERUP_RADIUS = 14;
const POWERUP_TTL = 10;         // segundos antes de desaparecer si no se recoge

// ── PowerUp (hexágono parpadeante) ────────────────────────────────────────
class PowerUp {
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
    if (blink < 0.3) return; // invisible parcialmente

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.7 + blink * 0.3;

    // Hexágono regular
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
      const x = Math.cos(angle) * this.radius;
      const y = Math.sin(angle) * this.radius;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();

    ctx.restore();
  }

  activate(ship) {
    activateShield(ship);
  }
}

// ── Funciones del escudo ──────────────────────────────────────────────────
let powerUps = [];

function trySpawnShieldPowerUp(x, y) {
  if (Math.random() < SHIELD_DROP_CHANCE) {
    powerUps.push(new PowerUp(x, y));
  }
}

function activateShield(ship) {
  ship.shieldActive = true;
  ship.shieldTimer = SHIELD_DURATION;
}

function updateShield(ship, dt) {
  if (ship.shieldActive) {
    ship.shieldTimer -= dt;
    if (ship.shieldTimer <= 0) {
      ship.shieldActive = false;
    }
  }
}

function drawShield(ship) {
  if (!ship.shieldActive) return;

  const remaining = ship.shieldTimer / SHIELD_DURATION;
  const alpha = 0.4 + remaining * 0.3;

  ctx.save();
  ctx.strokeStyle = `rgba(0, 220, 255, ${alpha})`;
  ctx.lineWidth = 2;
  ctx.globalAlpha = alpha;

  // Anillo de energía
  ctx.beginPath();
  ctx.arc(ship.x, ship.y, ship.radius + 8, 0, Math.PI * 2);
  ctx.stroke();

  // Parpadeo en último segundo
  if (ship.shieldTimer < 1) {
    const pulse = Math.sin(ship.shieldTimer * Math.PI * 4) * 0.5 + 0.5;
    ctx.strokeStyle = `rgba(0, 220, 255, ${(0.2 + pulse * 0.4)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(ship.x, ship.y, ship.radius + 12, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

function absorbShieldHit(ship, asteroid) {
  ship.shieldActive = false;
  asteroid.dead = true;
  score += POINTS[asteroid.size];
  explode(asteroid.x, asteroid.y, asteroid.size * 5);
  return asteroid.split();
}
