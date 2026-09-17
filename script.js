const canvas = document.getElementById("viewport");
const ctx = canvas.getContext("2d");

// PHYSICS
let GROUND_Y = 0;
const GRAVITY = 0.8;
const JUMP_FORCE = -18;

// GAME
let gameSpeed = 6;
let score = 0;
let gameOver = false;
let isPaused = false;
let obstacleTimer = 0;
let obstacleInterval = 150; // frame
let obstMinInterval = 60; // frame
let obstMaxInterval = 120; // frame

const player = {
    x: 80,
    y: GROUND_Y - 100,
    w: 72,
    h: 100,
    vy: 0,
    grounded: true
};

const obstacles = [];



// PREFABS + SPRITES
let obstaclePrefabs = [];
let prefabsLoaded = false;
const spriteCache = {};

function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`Error loading: ${src}`));
        img.src = src;
    });
}

async function loadObstaclePrefabs() {
    try {
        const res = await fetch("./assets/data/obstacles.json");
        if (!res.ok) {
            throw new Error(`HTTP ${res.status} during the fetch of obstacles.json`);
        }

        obstaclePrefabs = await res.json();

        if (!Array.isArray(obstaclePrefabs) || obstaclePrefabs.length === 0) {
            throw new Error("obstacles.json not valid or empty");
        }

        // preload sprite images
        const uniqueSprites = [...new Set(
            obstaclePrefabs.map(p => p.sprite).filter(Boolean)
        )];

        await Promise.all(
            uniqueSprites.map(async (src) => {
                try {
                    spriteCache[src] = await loadImage(src);
                } catch (e) {
                    console.warn(e.message);
                }
            })
        );

        prefabsLoaded = true;
    } catch (error) {
        console.error("Failed to load obstacle prefabs:", error);

        // fallback to let the game run 
        obstaclePrefabs = [{ id: "fallback", w: 25, h: 40, sprite: null }];
        prefabsLoaded = true;
    }
}



function update() {
    if (gameOver || isPaused) return;

    // Player physics
    player.vy += GRAVITY;
    player.y += player.vy;

    player.grounded = checkPlayerGrounded();

    // Obstacles
    obstacleTimerUpdate();
    obstacleMove();

    // Difficulty scaling
    score += 0.1;
    gameSpeed += score / 1000000;
}

function checkPlayerGrounded() {
    if (player.y >= GROUND_Y - player.h) {
        player.y = GROUND_Y - player.h;
        player.vy = 0;
        return true
    } else {
        return false;
    }
}

function obstacleTimerUpdate() {
    obstacleTimer++;
    if (obstacleTimer >= obstacleInterval) {
        spawnObstacle();
        obstacleTimer = 0;
        obstacleInterval = obstMinInterval + (Math.floor(Math.random() * obstMaxInterval));
    }
}

function spawnObstacle() {
    if (!prefabsLoaded || obstaclePrefabs.length === 0) return;

    const prefab = getRandomPrefab();

    obstacles.push({
        type: prefab.id,
        x: canvas.width + 20,
        y: GROUND_Y - prefab.h,
        w: prefab.w,
        h: prefab.h,
        sprite: prefab.sprite || null,
        type: prefab.type || "enemy"
    });
}

function getRandomPrefab() {
    const i = Math.floor(Math.random() * obstaclePrefabs.length);
    return obstaclePrefabs[i];
}

function obstacleMove() {
    obstacles.forEach(ob => {

        ob.x -= gameSpeed;


        if (rectsCollide(player, ob)) {
            if (ob.type === "enemy") {
                // console.log("I'm the enemy")
                callGameOver();
            }
            if (ob.type === "friend") {
                // console.log("I'm the friend")
                score += 10;
                obstacles.splice(obstacles.indexOf(ob), 1);
            }
        }


        if (ob.x + ob.w < 0) {
            obstacles.splice(obstacles.indexOf(ob), 1);
        }
    });
}

function callGameOver() { gameOver = true; }

function rectsCollide(a, b) {
    return (
        a.x < b.x + b.w &&
        a.x + a.w > b.x &&
        a.y < b.y + b.h &&
        a.y + a.h > b.y
    );
}

// to resize the resolution of the canvas to not distort the game view
function resizeCanvas() {
    // get the css display size
    const displayWidth = Math.floor(canvas.clientWidth);
    const displayHeight = Math.floor(canvas.clientHeight);

    // update the internal resolution only iof needed
    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
        canvas.width = displayWidth;
        canvas.height = displayHeight;
    }

    GROUND_Y = Math.floor(canvas.height * 0.8);

    if (player.grounded) {
        player.y = GROUND_Y - player.h;
    }
}

function draw() {
    // clear the viewport 
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawGround();
    drawPlayer();
    drawObstacles();
    drawScore();

    if (isPaused && !gameOver) {
        drawPauseOverlay();
    }

    if (gameOver) {
        drawGameOverOverlay();
    }
}

function drawGround() {
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    ctx.lineTo(canvas.width, GROUND_Y);
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 2;
    ctx.stroke();
}

function drawPlayer() {
    ctx.fillStyle = "#04ff00ff";
    ctx.fillRect(player.x, player.y, player.w, player.h);
}

function drawObstacles() {
    obstacles.forEach(ob => {
        const img = ob.sprite ? spriteCache[ob.sprite] : null;
        if (img) {
            ctx.drawImage(img, ob.x, ob.y, ob.w, ob.h);
        } else {
            ctx.fillStyle = "#ff0000ff";
            ctx.fillRect(ob.x, ob.y, ob.w, ob.h);
        }
    });
}

function drawScore() {
    ctx.fillStyle = "#111";
    ctx.font = "20px monospace";
    ctx.fillText(`Score: ${Math.floor(score)}`, 20, 30);
}

function drawGameOverOverlay() {
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // display here gameover panels 
    ctx.font = "32px sans-serif";
    ctx.fillText("Game Over", canvas.width / 2, canvas.height / 2 - 20);

    ctx.font = "20px sans-serif";
    ctx.fillText("Press R to restart", canvas.width / 2, canvas.height / 2 + 20);


    ctx.textAlign = "start";
    ctx.textBaseline = "alphabetic";
}

function drawPauseOverlay() {
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "28px sans-serif";
    ctx.fillText("PAUSED", canvas.width / 2, canvas.height / 2);
    ctx.font = "18px sans-serif";
    ctx.fillText("Press P to continue", canvas.width / 2, canvas.height / 2 + 30);

    ctx.textAlign = "start";
    ctx.textBaseline = "alphabetic";
}



function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

function resetGame() {
    score = 0;
    gameOver = false;
    isPaused = false;
    obstacles.length = 0;
    obstacleTimer = 0;
    obstacleInterval = 90;
    gameSpeed = 6;
    player.y = GROUND_Y - player.h;
    player.vy = 0;
    player.grounded = true;
}

window.addEventListener("keydown", (e) => {
    if (e.code === "Space" || e.code === "ArrowUp") jump();
    if (e.code === "KeyR" && gameOver) resetGame();
    if (e.code === "KeyP") pauseGame();
});

window.addEventListener("pointerdown", () => jump());
window.addEventListener("resize", resizeCanvas);

function jump() {
    if (player.grounded && !gameOver) {
        player.vy = JUMP_FORCE;
        player.grounded = false;
    }
}

function pauseGame() {
    if (gameOver) return;
    isPaused = !isPaused;
}

// startafter loading prefabs
(async function startGame() {
    await loadObstaclePrefabs();
    resizeCanvas();
    loop();
})();