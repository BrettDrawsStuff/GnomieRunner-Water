// ------------------- SEGMENT 1: GLOBAL SETUP + PRELOAD -------------------
let player;
let obstacles = [];
let collectibles = [];
let groundY;
let nextObstacleFrame = 0;
let nextCollectibleFrame = 0;
let score = 0;
let gameOverTime = 0;

// Images
let bgImg, blockImg, tallImg, holeImg, titleImg, playBtnImg;
let runFrames = [], jumpFrame, doubleJumpFrame, fallFrame;
let collectibleImg;
let gameOverImg;

let playButton;
let gameState = "title";

// Background scroll variables
let bgX1;
let bgX2;
let bgSpeed = 3.5;

let pixelFont;

let showJumpHint = true;
let jumpHintStartTime = 0;
const jumpHintDuration = 4000; // 4 seconds in milliseconds


const TARGET_HEIGHT = 100; // desired draw height for all player spr ites

function preload() {
  // Background and UI images
  bgImg = loadImage('background.png');
  blockImg = loadImage('block.png');
  tallImg = loadImage('tall.png');
  holeImg = loadImage('hole.png');
  titleImg = loadImage('title.png');
  playBtnImg = loadImage('play_button.png');
  gameOverImg = loadImage('gameover.gif');
  pixelFont = loadFont('pixelFont.ttf');

  // Player run frames (precompute _drawWidth and _drawHeight)
  runFrames = [];
  for (let i = 1; i <= 6; i++) {
    let img = loadImage(`run${i}.png`, (loadedImg) => {
      loadedImg._drawHeight = TARGET_HEIGHT;
      loadedImg._drawWidth = (loadedImg.width / loadedImg.height) * TARGET_HEIGHT;
    });
    runFrames.push(img);
  }

  // Jump / doubleJump / fall frames
  const extraFrames = ['jump.png', 'doubleJump.png', 'fall.png'];
  [jumpFrame, doubleJumpFrame, fallFrame] = extraFrames.map(f => {
    let img = loadImage(f, (loadedImg) => {
      loadedImg._drawHeight = TARGET_HEIGHT;
      loadedImg._drawWidth = (loadedImg.width / loadedImg.height) * TARGET_HEIGHT;
    });
    return img;
  });

  // Collectible image
  collectibleImg = loadImage('collectible.png');
}

function setup() {
  createCanvas(800, 400);
  groundY = height - 50;
  
  noSmooth();

  // Initialize background scroll
  bgX1 = 0;
  bgX2 = width;

  // Initialize player
  player = new Player();
}

// ------------------- SEGMENT 2: GAME LOOP & STATES -------------------
function draw() {
  drawBackground();

  if (gameState === "title") {
    drawTitleScreen();
  } else if (gameState === "playing") {
    drawGame();
  } else if (gameState === "gameOver") {
    drawGameOver();
    if (millis() - gameOverTime > 5000) {
      gameState = "title";
      if (!playButton) createPlayButton();
    }
  }
}

// Background scrolling
function drawBackground() {
  if (bgImg) {
    image(bgImg, bgX1, 0, width, height);
    image(bgImg, bgX2, 0, width, height);

    if (gameState === "playing") {
    bgX1 -= bgSpeed;
    bgX2 -= bgSpeed;

    if (bgX1 <= -width) bgX1 = bgX2 + width;
    if (bgX2 <= -width) bgX2 = bgX1 + width;
    }
  }
}

// Title screen
function drawTitleScreen() {
  if (titleImg) image(titleImg, width / 2 - titleImg.width / 2, 0);
  if (!playButton) createPlayButton();
}

function createPlayButton() {
  playButton = createImg('play_button.png');
  playButton.position(width / 2 - playBtnImg.width / 2, height / 2 + 10);
  playButton.size(playBtnImg.width, playBtnImg.height);
  playButton.mousePressed(startGame);
}

function startGame() {
  if (playButton) { playButton.remove(); playButton = null; }
  obstacles = [];
  collectibles = [];
  player = new Player();
  score = 0;
  nextObstacleFrame = frameCount + int(random(90, 150));
  nextCollectibleFrame = frameCount + int(random(100, 200));
  gameState = "playing";

  bgX1 = 0;
  bgX2 = width;
  
  // Reset jump hint
  showJumpHint = true;
  jumpHintStartTime = millis();
  
}

// Gameplay
function drawGame() {
  fill(255);
  textSize(24);
  textFont(pixelFont);
  textAlign(LEFT, TOP);
  text("Score: " + score, 10, 10);
  
  if (showJumpHint) {
  let elapsed = millis() - jumpHintStartTime;
  let alpha = map(elapsed, 0, jumpHintDuration, 255, 0); // fade from 255 → 0
  alpha = constrain(alpha, 0, 255);

  fill(255, alpha); // black text with fading alpha
  textFont(pixelFont);
  textSize(24);
  textAlign(CENTER, TOP);
  text("Press SPACE to jump", width / 2, 10);

  if (elapsed > jumpHintDuration) {
    showJumpHint = false; // completely hide after fade
  
}

}


  // Draw ground segments (skip holes)
  stroke(0);
  strokeWeight(0);
  let startX = 0;
  for (let obs of obstacles) {
    if (obs.type === "hole") {
      line(startX, groundY, obs.x, groundY);
      startX = obs.x + obs.w;
    }
  }
  line(startX, groundY, width, groundY);

  // Spawn obstacles and collectibles
  if (frameCount >= nextObstacleFrame) {
    obstacles.push(new Obstacle());
    nextObstacleFrame = frameCount + int(random(90, 150));
  }
  if (frameCount >= nextCollectibleFrame) {
    collectibles.push(new Collectible());
    nextCollectibleFrame = frameCount + int(random(100, 200));
  }

  // Draw block/tall obstacles and handle collisions
  for (let obs of obstacles) {
    obs.update();
    if (!obs.offscreen() && (obs.type === "block" || obs.type === "tall")) {
      obs.show();
      if (obs.hits(player)) triggerGameOver();
    }
  }

  // Draw holes **behind player**
  for (let obs of obstacles) {
    if (obs.type === "hole") obs.show();
  }

  // Update and draw player (in front of holes)
  player.update();
  player.show();

  // Hole collision logic
  for (let obs of obstacles) {
    if (obs.type === "hole") {
      let hitbox = player.getHitbox();
      let overHole = (hitbox.x + hitbox.w * 0.1 < obs.x + obs.w) &&
                     (hitbox.x + hitbox.w * 0.9 > obs.x);
      if (overHole && hitbox.y + hitbox.h >= groundY - 5) {
        player.falling = true;
      }
    }
  }

  // Update collectibles
  for (let i = collectibles.length - 1; i >= 0; i--) {
    let c = collectibles[i];
    c.update();
    c.show();
    if (c.collected(player)) {
      score++;
      collectibles.splice(i, 1);
    } else if (c.offscreen()) {
      collectibles.splice(i, 1);
    }
  }

  player.updateDust();
}

// Game over
function drawGameOver() {
  stroke(0);
  strokeWeight(0);
  let startX = 0;
  for (let obs of obstacles) {
    if (obs.type === "hole") {
      line(startX, groundY, obs.x, groundY);
      startX = obs.x + obs.w;
    }
  }
  line(startX, groundY, width, groundY);

  for (let obs of obstacles) obs.show();
  for (let c of collectibles) c.show();

  player.show();
  player.updateDust();

  // Display game over image
  if (millis() - gameOverTime > 150 && gameOverImg) {
    imageMode(CENTER);
    image(gameOverImg, width / 2, height / 2);
    imageMode(CORNER);
  }

  // Display score at top center
  fill(255);
  textFont(pixelFont);
  textSize(40);
  textAlign(CENTER, TOP);
  text("Score: " + score, width / 2, 10);
}

function triggerGameOver() {
  gameState = "gameOver";
  gameOverTime = millis();
}

function keyPressed() {
  // If on title screen and spacebar pressed, start game
  if (gameState === "title" && (key === ' ' || keyCode === 32)) {
    startGame();
  }
  // If playing, spacebar makes player jump
  else if (gameState === "playing" && keyCode === 32 && player && !player.falling) {
    player.jump();
  }
}

// ------------------- SEGMENT 3: PLAYER CLASS -------------------
class Player {
  constructor() {
    this.x = 100;
    this.y = groundY;

    // Use the global TARGET_HEIGHT for size
    this.targetHeight = TARGET_HEIGHT;
    this.size = this.targetHeight; // physics calculations

    // Hitbox proportional to sprite size
    this.hitboxWidth = this.targetHeight * 0.5;   // 50% of sprite width
    this.hitboxHeight = this.targetHeight * 0.8;   // 80% of sprite height
    this.hitboxOffsetX = (this.targetHeight - this.hitboxWidth) / 2;
    this.hitboxOffsetY = this.targetHeight - this.hitboxHeight;

    this.vy = 0;
    this.gravity = 0.95;
    this.jumpStrength = 15;
    this.jumpCount = 0;
    this.maxJumps = 2;

    this.dust = [];
    this.falling = false;

    this.frameIndex = 0;
    this.frameSpeed = 0.18;
  }

  update() {
    if (this.falling) {
      this.vy += this.gravity;
      this.y += this.vy;
      if (this.y > height + this.size) triggerGameOver();
      return;
    }

    this.y += this.vy;
    this.vy += this.gravity;

    // Ground collision
    if (this.y > groundY - this.size) {
      if (this.jumpCount === 2) this.spawnDust();
      this.y = groundY - this.size;
      this.vy = 0;
      this.jumpCount = 0;
    }

    // Run frame animation
    if (this.y >= groundY - this.size && !this.falling) {
      this.frameIndex += this.frameSpeed;
      if (this.frameIndex >= runFrames.length) this.frameIndex = 0;
    }
  }

  jump() {
    if (this.jumpCount < this.maxJumps && !this.falling) {
      this.vy = -this.jumpStrength;
      this.jumpCount++;
    }
  }

  show() {
    let imgToDraw;

    if (this.falling) imgToDraw = fallFrame;
    else if (this.y < groundY - this.size) {
      imgToDraw = this.jumpCount === 1 ? jumpFrame :
                  this.jumpCount === 2 ? doubleJumpFrame :
                  runFrames[floor(this.frameIndex)];
    } else {
      imgToDraw = runFrames[floor(this.frameIndex)];
    }

    if (imgToDraw) {
      // Use precomputed width/height if available, else scale proportionally
      let drawHeight = imgToDraw._drawHeight || this.targetHeight;
      let scaleFactor = drawHeight / imgToDraw.height;
      let drawWidth = imgToDraw.width * scaleFactor;

      // Bottom-aligned draw
      image(imgToDraw, this.x, this.y + (this.size - drawHeight), drawWidth, drawHeight);
    }
  }

  spawnDust() {
    for (let i = 0; i < 10; i++) {
      this.dust.push({
        x: this.x + this.hitboxWidth / 2,
        y: groundY,
        vx: random(-2, 2),
        vy: random(-5, -1),
        alpha: 255,
        r: random(3, 9)
      });
    }
  }

  updateDust() {
    for (let i = this.dust.length - 1; i >= 0; i--) {
      let p = this.dust[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.2;
      p.alpha -= 5;

      if (p.alpha <= 0) {
        this.dust.splice(i, 1);
      } else {
        push();
        noStroke();
        fill(77, 39, 27, p.alpha);
        rect(p.x, p.y, p.r);
        pop();
      }
    }
  }

  getHitbox() {
    return {
      x: this.x + this.hitboxOffsetX,
      y: this.y + this.hitboxOffsetY,
      w: this.hitboxWidth,
      h: this.hitboxHeight
    };
  }
}



// ------------------- SEGMENT 4: OBSTACLE CLASS -------------------
class Obstacle {
  constructor() {
    this.speed = 3.5;
    let r = random();

    if (r < 0.33) {
      this.type = "block";
      this.w = 32;
      this.h = 32;
      this.x = width;
      this.y = groundY - this.h + 9;
    } else if (r < 0.66) {
      this.type = "tall";
      this.w = 35;
      this.h = 100;
      this.x = width;
      this.y = groundY - this.h + 5;
    } else {
      this.type = "hole";
      this.w = int(random(50, 120));
      this.h = 60;
      this.x = width;
      this.y = groundY + 6;
    }
  }

  update() {
    this.x -= this.speed;
  }

  show() {
    if (this.type === "block" && blockImg) image(blockImg, this.x, this.y, this.w, this.h);
    else if (this.type === "tall" && tallImg) image(tallImg, this.x, this.y, this.w, this.h);
    else if (this.type === "hole" && holeImg) image(holeImg, this.x, this.y, this.w, this.h);
    else if (this.type === "block" || this.type === "tall") {
      push();
      fill(200, 50, 50);
      stroke(0);
      rect(this.x, this.y, this.w, this.h);
      pop();
    }
  }

  offscreen() {
    return this.x + this.w < 0;
  }

  hits(player) {
    if (this.type === "hole") return false;

    let hitbox = player.getHitbox();

    return !(hitbox.x + hitbox.w < this.x ||  // player left of obstacle
             hitbox.x > this.x + this.w||    // player right of obstacle
             hitbox.y + hitbox.h < this.y ||  // player above obstacle
             hitbox.y > this.y + this.h);     // player below obstacle
  }
}

// ------------------- SEGMENT 5: COLLECTIBLES + INPUT -------------------
class Collectible {
  constructor() {
    this.r = 18;
    this.x = width;
    this.y = random(groundY - 150, groundY - 30);
    this.speed = 3.5;
  }

  update() {
    this.x -= this.speed;
  }

  show() {
    if (collectibleImg) {
      image(collectibleImg, this.x - this.r, this.y - this.r, this.r * 2, this.r * 2);
    } else {
      fill(255, 255, 0);
      noStroke();
      ellipse(this.x, this.y, this.r * 2);
    }
  }

  collected(player) {
    let hitbox = player.getHitbox();

    // Check collision between player hitbox and collectible circle
    let closestX = constrain(this.x, hitbox.x, hitbox.x + hitbox.w);
    let closestY = constrain(this.y, hitbox.y, hitbox.y + hitbox.h);

    let dx = this.x - closestX;
    let dy = this.y - closestY;

    return (dx * dx + dy * dy) < (this.r * this.r);
  }

  offscreen() {
    return this.x + this.r < 0;
  }
}
