const canvas = document.getElementById("viewport");
const ctx = canvas.getContext("2d");

// PHYSICS
const GROUND_Y = 240;
const GRAVITY = 0.7;
const JUMP_FORCE = -12;

// GAME
let gameSpeed = 6;
let score = 0;
let gameOver = false;
let obstacleTimer = 0;
let obstacleInterval = 90; // frame
let obstMinInterval = 30; // frame
let obstMaxInterval = 60; // frame

const player = {
    x: 80,
    y: GROUND_Y - 50,
    w: 36,
    h: 50,
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

function getRandomPrefab() {
    const i = Math.floor(Math.random() * obstaclePrefabs.length);
    return obstaclePrefabs[i];
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
        sprite: prefab.sprite || null
    });
}

function rectsCollide(a, b) {
    return (
        a.x < b.x + b.w &&
        a.x + a.w > b.x &&
        a.y < b.y + b.h &&
        a.y + a.h > b.y
    );
}

function update() {
    if (gameOver) return;

    // Player physics
    player.vy += GRAVITY;
    player.y += player.vy;

    if (player.y >= GROUND_Y - player.h) {
        player.y = GROUND_Y - player.h;
        player.vy = 0;
        player.grounded = true;
    } else {
        player.grounded = false;
    }

    // Obstacles
    obstacleTimer++;
    if (obstacleTimer >= obstacleInterval) {
        spawnObstacle();
        obstacleTimer = 0;
        obstacleInterval = obstMinInterval + (Math.floor(Math.random() * obstMaxInterval));
    }

    for (let i = obstacles.length - 1; i >= 0; i--) {
        const ob = obstacles[i];
        ob.x -= gameSpeed;

        if (rectsCollide(player, ob)) {
            gameOver = true;
        }

        if (ob.x + ob.w < 0) {
            obstacles.splice(i, 1);
        }
    }

    // Difficulty scaling
    score += 0.1;
    gameSpeed += score / 100000;
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Ground
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    ctx.lineTo(canvas.width, GROUND_Y);
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Player
    ctx.fillStyle = "#04ff00ff";
    ctx.fillRect(player.x, player.y, player.w, player.h);

    // Obstacles
    obstacles.forEach(ob => {
        const img = ob.sprite ? spriteCache[ob.sprite] : null;
        if (img) {
            ctx.drawImage(img, ob.x, ob.y, ob.w, ob.h);
        } else {
            ctx.fillStyle = "#ff0000ff";
            ctx.fillRect(ob.x, ob.y, ob.w, ob.h);
        }
    });

    // Score
    ctx.fillStyle = "#111";
    ctx.font = "20px monospace";
    ctx.fillText(`Score: ${Math.floor(score)}`, 20, 30);

    if (gameOver) {
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "white";
        ctx.font = "32px sans-serif";
        ctx.fillText("Game Over", canvas.width / 2 - 90, 130);
        ctx.font = "20px sans-serif";
        ctx.fillText("Premi R per ricominciare", canvas.width / 2 - 120, 170);
    }
}

function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

function jump() {
    if (player.grounded && !gameOver) {
        player.vy = JUMP_FORCE;
        player.grounded = false;
    }
}

function resetGame() {
    score = 0;
    gameOver = false;
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
    // TODO pause the game with P key
});

window.addEventListener("pointerdown", () => jump());

// startafter loading prefabs
(async function startGame() {
    await loadObstaclePrefabs();
    loop();
})();