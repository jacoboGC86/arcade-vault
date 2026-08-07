import type { GameEngine, GameEngineState } from "./engine";

const W = 800;
const H = 600;

const RADII = [0, 16, 30, 50]; // por tamaño 1, 2, 3
const SPEEDS = [0, 85, 55, 32]; // velocidad base por tamaño
const POINTS = [0, 100, 50, 20]; // puntos por tamaño

const SHIELD_DURATION = 5; // segundos
const SHIELD_DROP_CHANCE = 0.08;
const POWERUP_RADIUS = 14;
const POWERUP_TTL = 10; // segundos antes de desaparecer si no se recoge

const TRIPLE_SHOT_DURATION = 10; // segundos
const TRIPLE_SHOT_DROP_CHANCE = 0.08;

const wrap = (v: number, max: number) => ((v % max) + max) % max;
const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y);
const rand = (min: number, max: number) => min + Math.random() * (max - min);
const randInt = (min: number, max: number) => Math.floor(rand(min, max + 1));

type GameState = "playing" | "dead" | "gameover";

export function createAsteroidsEngine(canvas: HTMLCanvasElement): GameEngine {
  const ctx = canvas.getContext("2d")!;

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
    if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) {
      e.preventDefault();
    }
  }

  function onKeyUp(e: KeyboardEvent) {
    keys[e.code] = false;
  }

  canvas.addEventListener("keydown", onKeyDown);
  canvas.addEventListener("keyup", onKeyUp);

  // ── Bullet ──────────────────────────────────────────────────────────────
  class Bullet {
    x: number;
    y: number;
    vx: number;
    vy: number;
    ttl = 1.1;
    radius = 2;
    dead = false;

    constructor(x: number, y: number, angle: number) {
      this.x = x;
      this.y = y;
      const SPEED = 520;
      this.vx = Math.cos(angle) * SPEED;
      this.vy = Math.sin(angle) * SPEED;
    }

    update(dt: number) {
      this.x = wrap(this.x + this.vx * dt, W);
      this.y = wrap(this.y + this.vy * dt, H);
      this.ttl -= dt;
      if (this.ttl <= 0) this.dead = true;
    }

    draw() {
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ── Asteroid ────────────────────────────────────────────────────────────
  class Asteroid {
    x: number;
    y: number;
    size: number;
    radius: number;
    dead = false;
    vx: number;
    vy: number;
    rotSpeed: number;
    rot: number;
    verts: [number, number][] = [];

    constructor(x: number, y: number, size = 3) {
      this.x = x;
      this.y = y;
      this.size = size;
      this.radius = RADII[size];

      const angle = rand(0, Math.PI * 2);
      const speed = SPEEDS[size] + rand(-15, 15);
      this.vx = Math.cos(angle) * speed;
      this.vy = Math.sin(angle) * speed;
      this.rotSpeed = rand(-1.2, 1.2);
      this.rot = rand(0, Math.PI * 2);

      const n = randInt(8, 13);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const r = this.radius * rand(0.6, 1.0);
        this.verts.push([Math.cos(a) * r, Math.sin(a) * r]);
      }
    }

    update(dt: number) {
      this.x = wrap(this.x + this.vx * dt, W);
      this.y = wrap(this.y + this.vy * dt, H);
      this.rot += this.rotSpeed * dt;
    }

    split(): Asteroid[] {
      if (this.size <= 1) return [];
      return [
        new Asteroid(this.x, this.y, this.size - 1),
        new Asteroid(this.x, this.y, this.size - 1),
      ];
    }

    draw() {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rot);
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1.5;
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(this.verts[0][0], this.verts[0][1]);
      for (let i = 1; i < this.verts.length; i++) {
        ctx.lineTo(this.verts[i][0], this.verts[i][1]);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }
  }

  // ── Ship ────────────────────────────────────────────────────────────────
  class Ship {
    x = 0;
    y = 0;
    angle = 0;
    vx = 0;
    vy = 0;
    radius = 12;
    thrusting = false;
    invincible = 0;
    shootCooldown = 0;
    dead = false;
    shieldActive = false;
    shieldTimer = 0;
    tripleShotActive = false;
    tripleShotTimer = 0;

    constructor() {
      this.reset();
    }

    reset() {
      this.x = W / 2;
      this.y = H / 2;
      this.angle = -Math.PI / 2;
      this.vx = 0;
      this.vy = 0;
      this.thrusting = false;
      this.invincible = 3;
      this.shootCooldown = 0;
      this.dead = false;
      this.shieldActive = false;
      this.shieldTimer = 0;
      this.tripleShotActive = false;
      this.tripleShotTimer = 0;
    }

    update(dt: number) {
      if (this.dead) return;
      if (this.invincible > 0) this.invincible -= dt;
      if (this.shootCooldown > 0) this.shootCooldown -= dt;

      const ROT = 3.5; // rad/s
      const THRUST = 260; // px/s²
      const DRAG = 0.987;

      if (keys["ArrowLeft"]) this.angle -= ROT * dt;
      if (keys["ArrowRight"]) this.angle += ROT * dt;

      this.thrusting = !!keys["ArrowUp"];
      if (this.thrusting) {
        this.vx += Math.cos(this.angle) * THRUST * dt;
        this.vy += Math.sin(this.angle) * THRUST * dt;
      }

      this.vx *= DRAG;
      this.vy *= DRAG;
      this.x = wrap(this.x + this.vx * dt, W);
      this.y = wrap(this.y + this.vy * dt, H);
    }

    tryShoot(): Bullet[] {
      if (this.shootCooldown > 0 || this.dead) return [];
      this.shootCooldown = 0.2;
      const NOSE = 21;
      const ox = this.x + Math.cos(this.angle) * NOSE;
      const oy = this.y + Math.sin(this.angle) * NOSE;

      if (this.tripleShotActive) {
        const SPREAD = 0.26; // ~15 grados
        return [
          new Bullet(ox, oy, this.angle - SPREAD),
          new Bullet(ox, oy, this.angle),
          new Bullet(ox, oy, this.angle + SPREAD),
        ];
      }
      return [new Bullet(ox, oy, this.angle)];
    }

    draw() {
      if (this.dead) return;
      if (this.invincible > 0 && Math.floor(this.invincible * 8) % 2 === 0) return;

      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.angle);
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1.5;
      ctx.lineJoin = "round";

      ctx.beginPath();
      ctx.moveTo(20, 0); // nariz
      ctx.lineTo(-12, -9); // ala izquierda
      ctx.lineTo(-7, 0); // muesca trasera
      ctx.lineTo(-12, 9); // ala derecha
      ctx.closePath();
      ctx.stroke();

      if (this.thrusting && Math.random() > 0.35) {
        ctx.beginPath();
        ctx.moveTo(-8, -4);
        ctx.lineTo(-8 - rand(6, 14), 0);
        ctx.lineTo(-8, 4);
        ctx.strokeStyle = "rgba(255, 130, 0, 0.85)";
        ctx.stroke();
      }

      ctx.restore();
    }
  }

  // ── Partículas (explosión) ─────────────────────────────────────────────
  class Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    ttl: number;
    dead = false;

    constructor(x: number, y: number) {
      this.x = x;
      this.y = y;
      const angle = rand(0, Math.PI * 2);
      const speed = rand(30, 130);
      this.vx = Math.cos(angle) * speed;
      this.vy = Math.sin(angle) * speed;
      this.life = rand(0.4, 1.1);
      this.ttl = this.life;
    }

    update(dt: number) {
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.ttl -= dt;
      if (this.ttl <= 0) this.dead = true;
    }

    draw() {
      const alpha = this.ttl / this.life;
      ctx.strokeStyle = `rgba(255,255,255,${alpha.toFixed(2)})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(this.x - this.vx * 0.05, this.y - this.vy * 0.05);
      ctx.stroke();
    }
  }

  // ── PowerUp (escudo, hexágono parpadeante) ─────────────────────────────
  class PowerUp {
    x: number;
    y: number;
    radius = POWERUP_RADIUS;
    ttl = POWERUP_TTL;
    dead = false;

    constructor(x: number, y: number) {
      this.x = x;
      this.y = y;
    }

    update(dt: number) {
      this.ttl -= dt;
      if (this.ttl <= 0) this.dead = true;
    }

    draw() {
      const blink = Math.sin(this.ttl * Math.PI * 2) * 0.5 + 0.5;
      if (blink < 0.3) return;

      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.7 + blink * 0.3;

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

    activate(ship: Ship) {
      activateShield(ship);
    }
  }

  // ── TriplePowerUp (disparo triple, diamante rojo parpadeante) ──────────
  class TriplePowerUp {
    x: number;
    y: number;
    radius = POWERUP_RADIUS;
    ttl = POWERUP_TTL;
    dead = false;

    constructor(x: number, y: number) {
      this.x = x;
      this.y = y;
    }

    update(dt: number) {
      this.ttl -= dt;
      if (this.ttl <= 0) this.dead = true;
    }

    draw() {
      const blink = Math.sin(this.ttl * Math.PI * 2) * 0.5 + 0.5;
      if (blink < 0.3) return;

      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(Math.PI / 4); // 45° para que sea un diamante
      ctx.strokeStyle = "#f00";
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.7 + blink * 0.3;

      ctx.strokeRect(-this.radius, -this.radius, this.radius * 2, this.radius * 2);

      ctx.restore();
    }

    activate(ship: Ship) {
      activateTripleShot(ship);
    }
  }

  type AnyPowerUp = PowerUp | TriplePowerUp;

  // ── Funciones del escudo ────────────────────────────────────────────────
  function trySpawnShieldPowerUp(x: number, y: number) {
    if (Math.random() < SHIELD_DROP_CHANCE) {
      powerUps.push(new PowerUp(x, y));
    }
  }

  function activateShield(ship: Ship) {
    ship.shieldActive = true;
    ship.shieldTimer = SHIELD_DURATION;
  }

  function updateShield(ship: Ship, dt: number) {
    if (ship.shieldActive) {
      ship.shieldTimer -= dt;
      if (ship.shieldTimer <= 0) {
        ship.shieldActive = false;
      }
    }
  }

  function drawShield(ship: Ship) {
    if (!ship.shieldActive) return;

    const remaining = ship.shieldTimer / SHIELD_DURATION;
    const alpha = 0.4 + remaining * 0.3;

    ctx.save();
    ctx.strokeStyle = `rgba(0, 220, 255, ${alpha})`;
    ctx.lineWidth = 2;
    ctx.globalAlpha = alpha;

    ctx.beginPath();
    ctx.arc(ship.x, ship.y, ship.radius + 8, 0, Math.PI * 2);
    ctx.stroke();

    if (ship.shieldTimer < 1) {
      const pulse = Math.sin(ship.shieldTimer * Math.PI * 4) * 0.5 + 0.5;
      ctx.strokeStyle = `rgba(0, 220, 255, ${0.2 + pulse * 0.4})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(ship.x, ship.y, ship.radius + 12, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  function absorbShieldHit(ship: Ship, asteroid: Asteroid): Asteroid[] {
    ship.shieldActive = false;
    asteroid.dead = true;
    score += POINTS[asteroid.size];
    explode(asteroid.x, asteroid.y, asteroid.size * 5);
    return asteroid.split();
  }

  // ── Funciones del disparo triple ────────────────────────────────────────
  function trySpawnTriplePowerUp(x: number, y: number) {
    if (Math.random() < TRIPLE_SHOT_DROP_CHANCE) {
      powerUps.push(new TriplePowerUp(x, y));
    }
  }

  function activateTripleShot(ship: Ship) {
    ship.tripleShotActive = true;
    ship.tripleShotTimer = TRIPLE_SHOT_DURATION;
  }

  function updateTripleShot(ship: Ship, dt: number) {
    if (ship.tripleShotActive) {
      ship.tripleShotTimer -= dt;
      if (ship.tripleShotTimer <= 0) {
        ship.tripleShotActive = false;
      }
    }
  }

  function drawTripleShot(ship: Ship) {
    if (!ship.tripleShotActive) return;

    const remaining = ship.tripleShotTimer / TRIPLE_SHOT_DURATION;
    const alpha = 0.3 + remaining * 0.2;

    ctx.save();
    ctx.strokeStyle = `rgba(255, 0, 0, ${alpha})`;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = alpha;

    ctx.translate(ship.x, ship.y);
    ctx.rotate(Math.PI / 4);
    ctx.strokeRect(
      -ship.radius - 10,
      -ship.radius - 10,
      (ship.radius + 10) * 2,
      (ship.radius + 10) * 2
    );

    ctx.restore();
  }

  // ── Estado del juego (por instancia, dentro del closure) ────────────────
  let ship: Ship;
  let bullets: Bullet[] = [];
  let asteroids: Asteroid[] = [];
  let particles: Particle[] = [];
  let powerUps: AnyPowerUp[] = [];
  let score = 0;
  let lives = 3;
  let level = 1;
  let state: GameState = "playing";
  let deadTimer = 0;
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

  function spawnAsteroids(count: number) {
    const SAFE_DIST = 130;
    for (let i = 0; i < count; i++) {
      let x: number, y: number;
      do {
        x = rand(0, W);
        y = rand(0, H);
      } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
      asteroids.push(new Asteroid(x, y, 3));
    }
  }

  function initGame() {
    ship = new Ship();
    bullets = [];
    asteroids = [];
    particles = [];
    powerUps = [];
    score = 0;
    lives = 3;
    level = 1;
    state = "playing";
    gameOverFired = false;
    spawnAsteroids(4);
    emitState();
  }

  function nextLevel() {
    level++;
    bullets = [];
    particles = [];
    powerUps = [];
    ship.reset();
    spawnAsteroids(3 + level);
  }

  function explode(x: number, y: number, count = 8) {
    for (let i = 0; i < count; i++) particles.push(new Particle(x, y));
  }

  function endGame() {
    if (gameOverFired) return;
    gameOverFired = true;
    state = "gameover";
    stopLoop();
    gameOverCb?.(score);
  }

  function killShip() {
    explode(ship.x, ship.y, 14);
    ship.dead = true;
    lives--;
    if (lives <= 0) {
      endGame();
    } else {
      state = "dead";
      deadTimer = 2;
    }
  }

  // ── Update ────────────────────────────────────────────────────────────
  function update(dt: number) {
    if (state === "dead") {
      deadTimer -= dt;
      particles.forEach((p) => p.update(dt));
      particles = particles.filter((p) => !p.dead);
      asteroids.forEach((a) => a.update(dt));
      if (deadTimer <= 0) {
        state = "playing";
        ship.reset();
      }
      return;
    }

    if (pressed("Space")) {
      bullets.push(...ship.tryShoot());
    }

    ship.update(dt);
    bullets.forEach((b) => b.update(dt));
    asteroids.forEach((a) => a.update(dt));
    particles.forEach((p) => p.update(dt));
    powerUps.forEach((p) => p.update(dt));

    bullets = bullets.filter((b) => !b.dead);
    particles = particles.filter((p) => !p.dead);
    powerUps = powerUps.filter((p) => !p.dead);

    updateShield(ship, dt);
    updateTripleShot(ship, dt);

    // Bala vs asteroide
    const newAsteroids: Asteroid[] = [];
    for (const b of bullets) {
      for (const a of asteroids) {
        if (!a.dead && !b.dead && dist(b, a) < a.radius) {
          b.dead = true;
          a.dead = true;
          score += POINTS[a.size];
          explode(a.x, a.y, a.size * 5);
          newAsteroids.push(...a.split());
          trySpawnShieldPowerUp(a.x, a.y);
          trySpawnTriplePowerUp(a.x, a.y);
        }
      }
    }
    asteroids = asteroids.filter((a) => !a.dead).concat(newAsteroids);
    bullets = bullets.filter((b) => !b.dead);

    // Nave vs powerup
    for (const p of powerUps) {
      if (dist(ship, p) < ship.radius + p.radius) {
        p.dead = true;
        p.activate(ship);
        break;
      }
    }

    // Nave vs asteroide
    if (!ship.dead && ship.invincible <= 0) {
      for (const a of asteroids) {
        if (dist(ship, a) < ship.radius + a.radius * 0.82) {
          if (ship.shieldActive) {
            const newAsteroids2 = absorbShieldHit(ship, a);
            asteroids = asteroids.filter((x) => !x.dead).concat(newAsteroids2);
          } else {
            killShip();
          }
          break;
        }
      }
    }

    // Nivel completado
    if (state === "playing" && asteroids.length === 0) nextLevel();
  }

  // ── Draw ──────────────────────────────────────────────────────────────
  function draw() {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);

    particles.forEach((p) => p.draw());
    asteroids.forEach((a) => a.draw());
    bullets.forEach((b) => b.draw());
    powerUps.forEach((p) => p.draw());
    ship.draw();
    drawShield(ship);
    drawTripleShot(ship);
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
  };
}
