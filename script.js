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


const player = {
    x: 80,
    y: GROUND_Y - 50,
    w: 36,
    h: 50,
    vy: 0,
    grounded: true
};

const obstacles = [];

function spawnObstacle() {
    const h = 30 + Math.random() * 30;
    const w = 20 + Math.random() * 20;
    obstacles.push({
        x: canvas.width + 20,
        y: GROUND_Y - h,
        w,
        h
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
        obstacleInterval -= score / 500; // Decrease interval over time
    }

    for (let i = obstacles.length - 1; i >= 0; i--) {
        const ob = obstacles[i];
        ob.x -= gameSpeed;

        if (rectsCollide(player, ob)) {
            gameOver = true;
        }

        if (ob.x + ob.w < 0) {
            obstacles.splice(i, 1); // Remove obstacles off-screen
        }
    }

    // Difficulty scaling
    score += 0.1;
    gameSpeed += score / 100000; // Increase speed over time
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
    ctx.fillStyle = "#ff0000ff";
    obstacles.forEach(ob => ctx.fillRect(ob.x, ob.y, ob.w, ob.h));

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

loop();