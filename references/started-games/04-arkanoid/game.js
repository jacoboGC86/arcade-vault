const canvas = document.getElementById( 'game' );
const ctx = canvas.getContext( '2d' );

const BLOCK_ROW_COLORS = [ 'red', 'yellow', 'cyan', 'magenta', 'hotpink', 'green', 'gray' ];
const BLOCK_COLS = 14;
const BLOCK_W = 54;
const BLOCK_H = 20;
const BLOCK_GAP = 2;
const BLOCK_SCORE = 10;
const BLOCK_OFFSET_X = ( canvas.width - BLOCK_COLS * ( BLOCK_W + BLOCK_GAP ) ) / 2;
const BLOCK_OFFSET_Y = 50;
const BASE_BALL_SPEED = { dx: 3, dy: -3 };
const TOTAL_LEVELS = 3;

const ballBounceSound = new Audio( 'assets/sounds/ball-bounce.mp3' );
const breakSound = new Audio( 'assets/sounds/break-sound.mp3' );

function playSound( audio ) {
  if ( gameState.muted ) return;
  audio.currentTime = 0;
  audio.play().catch( () => {} );
}

function createBlocks( level ) {
  const blocks = [];
  const rotation = ( level - 1 ) * 2;
  const rotatedColors = BLOCK_ROW_COLORS.slice( rotation ).concat( BLOCK_ROW_COLORS.slice( 0, rotation ) );
  rotatedColors.forEach( ( color, row ) => {
    for ( let col = 0; col < BLOCK_COLS; col++ ) {
      blocks.push( {
        x: BLOCK_OFFSET_X + col * ( BLOCK_W + BLOCK_GAP ),
        y: BLOCK_OFFSET_Y + row * ( BLOCK_H + BLOCK_GAP ),
        w: BLOCK_W,
        h: BLOCK_H,
        color,
        alive: true,
        exploding: false,
        explosionStart: null,
      } );
    }
  } );
  return blocks;
}

const gameState = {
  screen: 'start',
  score: 0,
  lives: 3,
  level: 1,
  paddle: { x: canvas.width / 2 - 40.5, y: canvas.height - 40, w: 81, h: 14, speed: 6 },
  ball: { x: canvas.width / 2, y: canvas.height - 60, dx: 3, dy: -3, radius: 8, launched: true },
  blocks: createBlocks( 1 ),
  muted: false,
};

function drawStartScreen() {
  ctx.fillStyle = '#000';
  ctx.fillRect( 0, 0, canvas.width, canvas.height );

  ctx.fillStyle = '#f0f0f0';
  ctx.font = '32px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.fillText( 'ARKANOID', canvas.width / 2, canvas.height / 2 - 20 );

  ctx.font = '18px "Courier New", monospace';
  ctx.fillText( 'Press SPACE to start', canvas.width / 2, canvas.height / 2 + 20 );
}

function drawPaddle() {
  const p = gameState.paddle;
  drawSprite( ctx, 'paddle', p.x, p.y, p.w, p.h );
}

function drawBall() {
  const b = gameState.ball;
  drawSprite( ctx, 'ball', b.x - b.radius, b.y - b.radius, b.radius * 2, b.radius * 2 );
}

function drawBlocks() {
  gameState.blocks.forEach( ( block ) => {
    if ( !block.alive ) return;

    if ( block.exploding ) {
      const frameIndex = Math.min(
        3,
        Math.floor( ( performance.now() - block.explosionStart ) / ( EXPLOSION_DURATION / 4 ) )
      );
      drawFrame( ctx, EXPLOSION_FRAMES[ block.color ][ frameIndex ], block.x, block.y, block.w, block.h );
      return;
    }

    drawSprite( ctx, `block_${ block.color }`, block.x, block.y, block.w, block.h );
  } );
}

function drawHUD() {
  ctx.fillStyle = '#f0f0f0';
  ctx.font = '16px "Courier New", monospace';
  ctx.textAlign = 'left';
  ctx.fillText( `Score: ${ gameState.score }`, 10, 20 );

  ctx.fillStyle = '#f0f0f0';
  ctx.fillText( 'Lives: ', 10, 40 );
  ctx.fillStyle = '#ff0000';
  ctx.fillText( '♥'.repeat( gameState.lives ), 10 + ctx.measureText( 'Lives: ' ).width, 40 );

  ctx.fillStyle = '#f0f0f0';
  ctx.textAlign = 'right';
  ctx.fillText( `Level: ${ gameState.level }`, canvas.width - 10, 20 );
  ctx.fillText( gameState.muted ? 'Sound: OFF' : 'Sound: ON', canvas.width - 10, 40 );
  ctx.textAlign = 'left';
}

function drawPlayingScreen() {
  ctx.fillStyle = '#000';
  ctx.fillRect( 0, 0, canvas.width, canvas.height );

  drawBlocks();
  drawPaddle();
  drawBall();
  drawHUD();
}

function drawEndScreen( title ) {
  drawPlayingScreen();

  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect( 0, 0, canvas.width, canvas.height );

  ctx.fillStyle = '#f0f0f0';
  ctx.font = '32px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.fillText( title, canvas.width / 2, canvas.height / 2 - 30 );

  ctx.font = '20px "Courier New", monospace';
  ctx.fillText( `Final score: ${ gameState.score }`, canvas.width / 2, canvas.height / 2 + 10 );

  ctx.font = '16px "Courier New", monospace';
  ctx.fillText( 'Press SPACE or R to restart', canvas.width / 2, canvas.height / 2 + 40 );
}

function drawPausedScreen() {
  drawPlayingScreen();

  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect( 0, 0, canvas.width, canvas.height );

  ctx.fillStyle = '#f0f0f0';
  ctx.font = '32px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.fillText( 'PAUSED', canvas.width / 2, canvas.height / 2 );
}

function drawLevelCompleteScreen() {
  drawPlayingScreen();

  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect( 0, 0, canvas.width, canvas.height );

  ctx.fillStyle = '#f0f0f0';
  ctx.font = '32px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.fillText( `Level ${ gameState.level } complete!`, canvas.width / 2, canvas.height / 2 - 15 );

  ctx.font = '16px "Courier New", monospace';
  ctx.fillText( 'Press SPACE to continue', canvas.width / 2, canvas.height / 2 + 20 );
}

function render() {
  if ( gameState.screen === 'start' ) {
    drawStartScreen();
  } else if ( gameState.screen === 'playing' ) {
    drawPlayingScreen();
  } else if ( gameState.screen === 'paused' ) {
    drawPausedScreen();
  } else if ( gameState.screen === 'levelcomplete' ) {
    drawLevelCompleteScreen();
  } else if ( gameState.screen === 'gameover' ) {
    drawEndScreen( 'GAME OVER' );
  } else if ( gameState.screen === 'win' ) {
    drawEndScreen( 'ALL LEVELS CLEARED' );
  }
}

const keys = {};

document.addEventListener( 'keydown', ( e ) => {
  keys[ e.code ] = true;

  if ( gameState.screen === 'start' && e.code === 'Space' ) {
    gameState.screen = 'playing';
  } else if ( gameState.screen === 'playing' && !gameState.ball.launched && e.code === 'Space' ) {
    launchBall();
  } else if ( gameState.screen === 'levelcomplete' && e.code === 'Space' ) {
    advanceLevel();
  } else if ( ( gameState.screen === 'gameover' || gameState.screen === 'win' ) &&
    ( e.code === 'Space' || e.code === 'KeyR' ) ) {
    resetGame();
  } else if ( gameState.screen === 'playing' && ( e.code === 'KeyP' || e.code === 'Escape' ) ) {
    gameState.screen = 'paused';
  } else if ( gameState.screen === 'paused' && ( e.code === 'KeyP' || e.code === 'Escape' ) ) {
    gameState.screen = 'playing';
  } else if ( e.code === 'KeyM' ) {
    gameState.muted = !gameState.muted;
  }
} );

document.addEventListener( 'keyup', ( e ) => {
  keys[ e.code ] = false;
} );

function updatePaddle() {
  const p = gameState.paddle;
  if ( keys[ 'ArrowLeft' ] ) p.x -= p.speed;
  if ( keys[ 'ArrowRight' ] ) p.x += p.speed;
  p.x = Math.max( 0, Math.min( canvas.width - p.w, p.x ) );
}

function launchBall() {
  const b = gameState.ball;
  const speedMultiplier = 1.15 ** ( gameState.level - 1 );
  b.dx = BASE_BALL_SPEED.dx * speedMultiplier;
  b.dy = BASE_BALL_SPEED.dy * speedMultiplier;
  b.launched = true;
}

function resetBallOnPaddle() {
  const b = gameState.ball;
  const p = gameState.paddle;
  b.x = p.x + p.w / 2;
  b.y = p.y - b.radius;
  b.dx = 0;
  b.dy = 0;
  b.launched = false;
}

function updateBall() {
  const b = gameState.ball;
  const p = gameState.paddle;

  if ( !b.launched ) {
    b.x = p.x + p.w / 2;
    b.y = p.y - b.radius;
    return;
  }

  b.x += b.dx;
  b.y += b.dy;

  if ( b.x - b.radius <= 0 ) {
    b.x = b.radius;
    b.dx = -b.dx;
    playSound( ballBounceSound );
  } else if ( b.x + b.radius >= canvas.width ) {
    b.x = canvas.width - b.radius;
    b.dx = -b.dx;
    playSound( ballBounceSound );
  }

  if ( b.y - b.radius <= 0 ) {
    b.y = b.radius;
    b.dy = -b.dy;
    playSound( ballBounceSound );
  }

  const hitsPaddle = b.dy > 0 &&
    b.x + b.radius >= p.x &&
    b.x - b.radius <= p.x + p.w &&
    b.y + b.radius >= p.y &&
    b.y - b.radius <= p.y + p.h;

  if ( hitsPaddle ) {
    b.y = p.y - b.radius;
    b.dy = -b.dy;
    playSound( ballBounceSound );
  }

  if ( b.y - b.radius > canvas.height ) {
    gameState.lives -= 1;
    resetBallOnPaddle();
  }
}

function checkBlockCollision() {
  const b = gameState.ball;

  for ( const block of gameState.blocks ) {
    if ( !block.alive ) continue;

    const hits = b.x + b.radius >= block.x &&
      b.x - b.radius <= block.x + block.w &&
      b.y + b.radius >= block.y &&
      b.y - b.radius <= block.y + block.h;

    if ( hits ) {
      if ( !block.exploding ) {
        block.exploding = true;
        block.explosionStart = performance.now();
        gameState.score += BLOCK_SCORE;
        playSound( breakSound );
      }
      b.dy = -b.dy;
      break;
    }
  }
}

function advanceLevel() {
  gameState.level++;
  gameState.blocks = createBlocks( gameState.level );
  resetBallOnPaddle();
  gameState.screen = 'playing';
}

function resetGame() {
  gameState.score = 0;
  gameState.lives = 3;
  gameState.level = 1;
  gameState.blocks = createBlocks( 1 );
  gameState.paddle.x = canvas.width / 2 - gameState.paddle.w / 2;
  resetBallOnPaddle();
  launchBall();
  gameState.screen = 'playing';
}

function updateExplosions() {
  const now = performance.now();

  for ( const block of gameState.blocks ) {
    if ( block.exploding && now - block.explosionStart >= EXPLOSION_DURATION ) {
      block.alive = false;
      block.exploding = false;
      block.explosionStart = null;
    }
  }
}

function update() {
  if ( gameState.screen !== 'playing' ) return;
  updatePaddle();
  updateBall();

  if ( gameState.lives <= 0 ) {
    gameState.screen = 'gameover';
    return;
  }

  checkBlockCollision();
  updateExplosions();

  if ( gameState.blocks.every( ( block ) => !block.alive ) ) {
    gameState.screen = gameState.level < TOTAL_LEVELS ? 'levelcomplete' : 'win';
  }
}

function gameLoop() {
  update();
  render();
  requestAnimationFrame( gameLoop );
}

loadSpritesheet( () => {
  gameLoop();
} );
