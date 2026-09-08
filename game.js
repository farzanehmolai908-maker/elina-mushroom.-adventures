"use strict";

/* =========================================================
   ELINA MUSHROOM ADVENTURE
   Game.js هماهنگ با چیدمان جدید
   ========================================================= */


/* =========================
   DOM HELPER
   ========================= */

function $(...ids) {
    for (const id of ids) {
        const el = document.getElementById(id);
        if (el) return el;
    }
    return null;
}

function onClick(element, fn) {
    if (!element) return;
    element.addEventListener("click", fn);
    element.addEventListener("touchend", function (e) {
        e.preventDefault();
        fn(e);
    }, { passive: false });
}


/* =========================
   CANVAS
   ========================= */

const canvas = $("gameCanvas", "game");

if (!canvas) {
    throw new Error("Canvas پیدا نشد. id باید gameCanvas یا game باشد.");
}

const ctx = canvas.getContext("2d");

let W = window.innerWidth;
let H = window.innerHeight;

const DPR = Math.min(window.devicePixelRatio || 1, 2);

function resizeCanvas() {
    W = window.innerWidth;
    H = window.innerHeight;

    canvas.width = W * DPR;
    canvas.height = H * DPR;

    canvas.style.width = W + "px";
    canvas.style.height = H + "px";

    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();


/* =========================
   SCREENS
   ========================= */

const menuScreen =
    $("mainMenu", "menu");

const worldScreen =
    $("worldMenu", "worldSelect", "levels");

const levelScreen =
    $("levelMenu", "levelSelect");

const characterScreen =
    $("characterMenu", "characters");

const gameScreen =
    $("gameScreen");

const finishScreen =
    $("finish", "levelComplete");

const treasureScreen =
    $("treasure");

const gameOverScreen =
    $("gameOver", "gameover");


function hideAllScreens() {
    document.querySelectorAll(".screen, .overlay").forEach(screen => {
        screen.classList.add("hidden");
    });
}


function showScreen(screen) {
    hideAllScreens();

    if (screen) {
        screen.classList.remove("hidden");
    }
}


/* =========================
   GAME DATA
   ========================= */

const worlds = [
    {
        name: "جنگل",
        sky1: "#74c9f4",
        sky2: "#e8f8ff",
        ground: "#6b4a32",
        grass: "#55a83f",
        accent: "#2d7d32",
        enemies: ["snail", "bee", "turtle"]
    },

    {
        name: "برف",
        sky1: "#65b6ed",
        sky2: "#effbff",
        ground: "#71818c",
        grass: "#ffffff",
        accent: "#bde8ff",
        enemies: ["penguin", "sheep", "snowball"]
    },

    {
        name: "دریا",
        sky1: "#087db5",
        sky2: "#b9f5ff",
        ground: "#477b83",
        grass: "#6edbd4",
        accent: "#1595a8",
        enemies: ["fish", "bubble", "crab"]
    },

    {
        name: "آتشفشان",
        sky1: "#35131a",
        sky2: "#ff7027",
        ground: "#593128",
        grass: "#ff9c32",
        accent: "#ff3d18",
        enemies: ["fire", "lava", "bomb"]
    }
];


/* =========================
   SAVE
   ========================= */

let save = JSON.parse(
    localStorage.getItem("elinaSave") ||
    JSON.stringify({
        coins: 0,
        gems: 0,
        lives: 3,
        unlocked: 1,
        char: 0,
        owned: [0]
    })
);


function saveGame() {
    localStorage.setItem(
        "elinaSave",
        JSON.stringify(save)
    );
}


/* =========================
   GAME STATE
   ========================= */

let world = 0;
let level = 1;

let running = false;
let camera = 0;

let player = null;

let platforms = [];
let coins = [];
let hearts = [];
let ammoItems = [];
let enemies = [];
let shots = [];
let particles = [];

let goalX = 0;

let treasureMode = false;


/* =========================
   INPUT
   ========================= */

const keys = {
    left: false,
    right: false
};


function bindHoldButton(element, property) {

    if (!element) return;

    const start = function (e) {
        e.preventDefault();
        keys[property] = true;
        element.classList.add("pressed");
    };

    const stop = function (e) {
        if (e) e.preventDefault();

        keys[property] = false;
        element.classList.remove("pressed");
    };

    element.addEventListener("pointerdown", start);
    element.addEventListener("pointerup", stop);
    element.addEventListener("pointercancel", stop);
    element.addEventListener("pointerleave", stop);
}


/* جدید + قدیمی */
bindHoldButton(
    $("leftButton", "left"),
    "left"
);

bindHoldButton(
    $("rightButton", "right"),
    "right"
);


/* =========================
   JUMP
   ========================= */

function jump() {

    if (!running || !player) return;

    if (player.onGround) {

        player.vy = -13;
        player.onGround = false;

        createDust(
            player.x + player.w / 2,
            player.y + player.h
        );
    }
}


/* =========================
   SHOOT
   ========================= */

function shoot() {

    if (!running || !player) return;

    if (player.ammo <= 0) {
        showMessage("🔫 تیر نداری!");
        return;
    }

    player.ammo--;

    shots.push({
        x: player.dir > 0
            ? player.x + player.w
            : player.x - 8,

        y: player.y + 30,

        vx: player.dir * 12,

        life: 70
    });

    createParticles(
        player.x + (player.dir > 0 ? player.w : 0),
        player.y + 30,
        "#ffd83d",
        5
    );

    updateHUD();
}


/* دکمه‌های جدید */
const jumpButton =
    $("jumpButton", "jump");

const shootButton =
    $("shootButton", "shoot");

if (jumpButton) {

    jumpButton.addEventListener("pointerdown", e => {
        e.preventDefault();
        jump();
    });
}

if (shootButton) {

    shootButton.addEventListener("pointerdown", e => {
        e.preventDefault();
        shoot();
    });
}


/* =========================
   KEYBOARD
   ========================= */

window.addEventListener("keydown", e => {

    if (
        e.key === "ArrowLeft" ||
        e.key.toLowerCase() === "a"
    ) {
        keys.left = true;
    }

    if (
        e.key === "ArrowRight" ||
        e.key.toLowerCase() === "d"
    ) {
        keys.right = true;
    }

    if (
        e.key === "ArrowUp" ||
        e.key.toLowerCase() === "w" ||
        e.code === "Space"
    ) {
        e.preventDefault();
        jump();
    }

    if (
        e.key.toLowerCase() === "f" ||
        e.key === "Enter"
    ) {
        shoot();
    }
});


window.addEventListener("keyup", e => {

    if (
        e.key === "ArrowLeft" ||
        e.key.toLowerCase() === "a"
    ) {
        keys.left = false;
    }

    if (
        e.key === "ArrowRight" ||
        e.key.toLowerCase() === "d"
    ) {
        keys.right = false;
    }
});


/* =========================
   HUD
   ========================= */

function updateHUD() {

    const lives = $("lives");
    const coinsEl = $("coins");
    const gems = $("gems");
    const ammo = $("ammo");
    const score = $("score");
    const stage = $("stage");

    if (lives)
        lives.textContent = save.lives;

    if (coinsEl)
        coinsEl.textContent = save.coins;

    if (gems)
        gems.textContent = save.gems;

    if (ammo)
        ammo.textContent = player ? player.ammo : 7;

    if (score)
        score.textContent = player ? player.score : 0;

    if (stage)
        stage.textContent = `${world + 1}-${level}`;

    const worldEl = $("world");
    const levelEl = $("level");

    if (worldEl)
        worldEl.textContent = world + 1;

    if (levelEl)
        levelEl.textContent = level;
}


/* =========================
   MESSAGE
   ========================= */

let messageTimer = null;

function showMessage(text) {

    const message = $("message");

    if (!message) return;

    message.textContent = text;
    message.style.opacity = "1";

    clearTimeout(messageTimer);

    messageTimer = setTimeout(() => {
        message.style.opacity = "0";
    }, 1500);
}


/* =========================
   LEVEL CREATION
   ========================= */

function createLevel() {

    platforms = [];
    coins = [];
    hearts = [];
    ammoItems = [];
    enemies = [];
    shots = [];
    particles = [];

    const length =
        3600 +
        level * 220 +
        world * 350;

    goalX = length - 170;


    /* زمین شروع */
    platforms.push({
        x: 0,
        y: H - 125,
        w: 650,
        h: 125
    });


    let x = 600;

    while (x < length - 320) {

        const gap =
            70 +
            Math.random() * 110;

        const width =
            160 +
            Math.random() * 190;

        const y =
            Math.max(
                210,
                Math.min(
                    H - 150,
                    H - 250 - Math.random() * 160
                )
            );

        platforms.push({
            x: x + gap,
            y: y,
            w: width,
            h: 32
        });


        /* سکه */
        if (Math.random() < 0.8) {

            coins.push({
                x: x + gap + width / 2,
                y: y - 55,
                got: false,
                angle: 0
            });
        }


        /* قلب */
        if (Math.random() < 0.18) {

            hearts.push({
                x: x + gap + width * 0.75,
                y: y - 75,
                got: false
            });
        }


        /* تیر */
        if (Math.random() < 0.3) {

            ammoItems.push({
                x: x + gap + width * 0.2,
                y: y - 45,
                got: false
            });
        }


        /* دشمن */
        if (Math.random() < 0.72) {

            const type =
                worlds[world]
                    .enemies[
                        Math.floor(
                            Math.random() *
                            worlds[world].enemies.length
                        )
                    ];

            enemies.push({
                x: x + gap + width * 0.65,
                y: y - 45,

                type,

                w: 46,
                h: 45,

                alive: true,

                vx:
                    (Math.random() < 0.5 ? -1 : 1) *
                    (0.6 + level * 0.05),

                minX: x + gap,
                maxX: x + gap + width - 46,

                anim: Math.random() * 10
            });
        }

        x += gap + width;
    }


    /* زمین پایانی */
    platforms.push({
        x: length - 280,
        y: H - 125,
        w: 280,
        h: 125
    });


    /* سکه‌های آخر */
    for (let i = 0; i < 8; i++) {

        coins.push({
            x: length - 240 + i * 30,
            y: H - 210 - (i % 2) * 35,
            got: false,
            angle: 0
        });
    }


    player = {

        x: 70,
        y: H - 210,

        w: 44,
        h: 68,

        vx: 0,
        vy: 0,

        dir: 1,

        onGround: false,

        lives: save.lives,

        ammo: 7,

        inv: 80,

        score: 0,

        anim: 0
    };


    camera = 0;

    updateHUD();
}


/* =========================
   COLLISION
   ========================= */

function rectHit(a, b) {

    return (
        a.x < b.x + b.w &&
        a.x + a.w > b.x &&
        a.y < b.y + b.h &&
        a.y + a.h > b.y
    );
}


/* =========================
   DAMAGE
   ========================= */

function hurt() {

    if (!player || player.inv > 0)
        return;

    save.lives--;

    player.lives = save.lives;

    saveGame();

    createParticles(
        player.x + 20,
        player.y + 30,
        "#ff4b4b",
        14
    );


    if (save.lives <= 0) {

        running = false;

        showScreen(gameOverScreen);

        return;
    }


    player.x =
        Math.max(60, player.x - 220);

    player.y = 120;

    player.vx = 0;
    player.vy = 0;

    player.inv = 110;

    updateHUD();

    showMessage("❤️ یک جان کم شد!");
}


/* =========================
   GEM SYSTEM
   ========================= */

function checkGems() {

    while (save.coins >= 60) {

        save.coins -= 60;
        save.gems++;

        showMessage("💎 یک الماس گرفتی!");

        createParticles(
            player.x,
            player.y,
            "#7ee8ff",
            18
        );
    }

    saveGame();
}


/* =========================
   PARTICLES
   ========================= */

function createParticles(
    x,
    y,
    color,
    count = 8
) {

    for (let i = 0; i < count; i++) {

        particles.push({

            x,
            y,

            vx:
                (Math.random() - 0.5) *
                5,

            vy:
                (Math.random() - 0.5) *
                5,

            life:
                20 +
                Math.random() * 20,

            size:
                2 +
                Math.random() * 4,

            color
        });
    }
}


function createDust(x, y) {

    createParticles(
        x,
        y,
        "#d8c19b",
        8
    );
}


function updateParticles() {

    for (const p of particles) {

        p.x += p.vx;
        p.y += p.vy;

        p.vy += 0.12;

        p.life--;
    }

    particles =
        particles.filter(p => p.life > 0);
}


function drawParticles() {

    for (const p of particles) {

        ctx.globalAlpha =
            Math.max(0, p.life / 40);

        ctx.fillStyle = p.color;

        ctx.beginPath();

        ctx.arc(
            p.x - camera,
            p.y,
            p.size,
            0,
            Math.PI * 2
        );

        ctx.fill();
    }

    ctx.globalAlpha = 1;
}


/* =========================
   GAME UPDATE
   ========================= */

function update() {

    if (!running || !player)
        return;


    const speed =
        world === 3 ? 4.8 : 4.5;


    /* حرکت */
    player.vx =
        (keys.right ? speed : 0) -
        (keys.left ? speed : 0);


    if (player.vx !== 0) {

        player.dir =
            player.vx > 0 ? 1 : -1;

        player.anim += 0.25;
    }


    /* جاذبه */
    player.vy += 0.62;

    player.x += player.vx;
    player.y += player.vy;


    player.onGround = false;


    /* برخورد با سکو */
    for (const p of platforms) {

        if (
            player.vy >= 0 &&
            player.x + player.w > p.x &&
            player.x < p.x + p.w &&
            player.y + player.h <= p.y + 20 &&
            player.y + player.h + player.vy >= p.y
        ) {

            player.y =
                p.y - player.h;

            player.vy = 0;

            player.onGround = true;
        }
    }


    /* سقوط */
    if (player.y > H + 100) {

        hurt();

        if (player) {
            player.y = 80;
        }
    }


    /* سکه */
    for (const c of coins) {

        c.angle += 0.12;

        if (
            !c.got &&
            Math.hypot(
                player.x + 22 - c.x,
                player.y + 28 - c.y
            ) < 38
        ) {

            c.got = true;

            save.coins++;

            player.score += 25;

            createParticles(
                c.x,
                c.y,
                "#ffe45c",
                10
            );

            checkGems();
        }
    }


    /* قلب */
    for (const h of hearts) {

        if (
            !h.got &&
            Math.hypot(
                player.x + 22 - h.x,
                player.y + 28 - h.y
            ) < 40
        ) {

            h.got = true;

            save.lives =
                Math.min(5, save.lives + 1);

            saveGame();

            createParticles(
                h.x,
                h.y,
                "#ff5b73",
                12
            );

            showMessage("❤️ یک جان گرفتی!");
        }
    }


    /* تیر */
    for (const a of ammoItems) {

        if (
            !a.got &&
            Math.hypot(
                player.x + 22 - a.x,
                player.y + 28 - a.y
            ) < 40
        ) {

            a.got = true;

            player.ammo =
                Math.min(7, player.ammo + 1);

            createParticles(
                a.x,
                a.y,
                "#ffd45a",
                10
            );

            showMessage("🔫 تیر گرفتی!");
        }
    }


    /* دشمن‌ها */
    for (const e of enemies) {

        if (!e.alive)
            continue;

        e.x += e.vx;
        e.anim += 0.12;


        if (e.x < e.minX ||
            e.x > e.maxX) {

            e.vx *= -1;
        }


        if (
            rectHit(
                player,
                {
                    x: e.x,
                    y: e.y,
                    w: e.w,
                    h: e.h
                }
            )
        ) {

            /* پریدن روی دشمن */
            if (
                player.vy > 2 &&
                player.y + player.h <
                e.y + 25
            ) {

                e.alive = false;

                player.vy = -9;

                player.score += 150;

                createParticles(
                    e.x + 20,
                    e.y + 20,
                    "#fff",
                    15
                );

            } else {

                hurt();
            }
        }
    }


    /* گلوله‌ها */
    for (const s of shots) {

        s.x += s.vx;
        s.life--;


        createParticles(
            s.x,
            s.y,
            "#ffd83d",
            1
        );


        for (const e of enemies) {

            if (!e.alive)
                continue;


            if (
                Math.abs(s.x - e.x) < 42 &&
                Math.abs(s.y - e.y) < 55
            ) {

                e.alive = false;

                s.life = 0;

                player.score += 150;

                createParticles(
                    e.x + 20,
                    e.y + 20,
                    "#ffcc44",
                    18
                );
            }
        }
    }


    shots =
        shots.filter(s => s.life > 0);


    if (player.inv > 0)
        player.inv--;


    /* دوربین */
    camera +=
        (
            player.x -
            camera -
            W * 0.35
        ) * 0.1;


    camera =
        Math.max(
            0,
            Math.min(
                Math.max(0, goalX - W * 0.55),
                camera
            )
        );


    /* پایان مرحله */
    if (player.x > goalX) {

        finishLevel();
    }


    updateParticles();
    updateHUD();
}


/* =========================
   FINISH LEVEL
   ========================= */

function finishLevel() {

    if (!running)
        return;

    running = false;


    const completed =
        world * 10 + level;


    if (
        completed >= save.unlocked
    ) {

        save.unlocked =
            Math.min(
                40,
                completed + 1
            );
    }


    saveGame();


    const stats =
        $("finishStats", "resultText");

    if (stats) {

        stats.textContent =
            `🪙 سکه‌ها: ${save.coins}   💎 الماس‌ها: ${save.gems}`;
    }


    showScreen(finishScreen);
}


/* =========================
   BACKGROUND
   ========================= */

function drawBackground() {

    const wd = worlds[world];


    const gradient =
        ctx.createLinearGradient(
            0,
            0,
            0,
            H
        );

    gradient.addColorStop(
        0,
        wd.sky1
    );

    gradient.addColorStop(
        1,
        wd.sky2
    );

    ctx.fillStyle = gradient;

    ctx.fillRect(
        0,
        0,
        W,
        H
    );


    /* خورشید */
    if (world === 0) {

        ctx.fillStyle = "#ffe36e";

        ctx.beginPath();

        ctx.arc(
            W - 100,
            100,
            45,
            0,
            Math.PI * 2
        );

        ctx.fill();
    }


    /* ابرها */
    ctx.fillStyle = "rgba(255,255,255,.75)";

    for (let i = 0; i < 7; i++) {

        let x =
            (
                i * 260 -
                camera * 0.15
            ) % (W + 300);

        if (x < -150)
            x += W + 300;

        const y =
            70 +
            (i % 3) * 65;

        ctx.beginPath();

        ctx.arc(x, y, 25, 0, Math.PI * 2);
        ctx.arc(x + 28, y - 12, 32, 0, Math.PI * 2);
        ctx.arc(x + 62, y, 25, 0, Math.PI * 2);

        ctx.fill();
    }


    /* تپه‌ها */
    ctx.fillStyle = wd.accent;

    for (let i = 0; i < 8; i++) {

        let x =
            (
                i * 300 -
                camera * 0.25
            ) % (W + 350);

        if (x < -200)
            x += W + 350;

        ctx.beginPath();

        ctx.arc(
            x,
            H - 80,
            170,
            Math.PI,
            0
        );

        ctx.fill();
    }


    /* درخت‌های جنگل */
    if (world === 0) {

        for (let i = 0; i < 10; i++) {

            let x =
                (
                    i * 270 -
                    camera * 0.35
                ) % (W + 300);

            if (x < -100)
                x += W + 300;


            ctx.fillStyle = "#65432b";

            ctx.fillRect(
                x,
                H - 270,
                35,
                160
            );


            ctx.fillStyle =
                i % 2
                    ? "#277d38"
                    : "#3e9644";


            ctx.beginPath();

            ctx.arc(
                x + 18,
                H - 285,
                75,
                0,
                Math.PI * 2
            );

            ctx.fill();


            ctx.beginPath();

            ctx.arc(
                x - 25,
                H - 250,
                55,
                0,
                Math.PI * 2
            );

            ctx.fill();


            ctx.beginPath();

            ctx.arc(
                x + 60,
                H - 245,
                55,
                0,
                Math.PI * 2
            );

            ctx.fill();
        }
    }


    /* برف */
    if (world === 1) {

        ctx.fillStyle =
            "rgba(255,255,255,.8)";

        for (let i = 0; i < 70; i++) {

            let x =
                (i * 97 - camera * 0.1)
                % W;

            if (x < 0)
                x += W;

            let y =
                (i * 53) %
                Math.max(1, H - 120);

            ctx.beginPath();

            ctx.arc(
                x,
                y,
                2 + i % 3,
                0,
                Math.PI * 2
            );

            ctx.fill();
        }
    }


    /* دریا */
    if (world === 2) {

        ctx.fillStyle =
            "rgba(255,255,255,.25)";

        for (let i = 0; i < 9; i++) {

            let x =
                (
                    i * 250 -
                    camera * 0.15
                ) % (W + 250);

            ctx.beginPath();

            ctx.arc(
                x,
                H - 70,
                90,
                Math.PI,
                0
            );

            ctx.fill();
        }
    }


    /* آتش */
    if (world === 3) {

        ctx.fillStyle =
            "rgba(255,150,30,.25)";

        for (let i = 0; i < 20; i++) {

            let x =
                (
                    i * 90 -
                    camera * 0.2
                ) % W;

            if (x < 0)
                x += W;

            let y =
                70 +
                (i * 47) % 300;

            ctx.beginPath();

            ctx.arc(
                x,
                y,
                8 + i % 5,
                0,
                Math.PI * 2
            );

            ctx.fill();
        }
    }
}


/* =========================
   PLATFORMS
   ========================= */

function drawPlatforms() {

    const wd = worlds[world];


    for (const p of platforms) {

        const x =
            p.x - camera;


        if (
            x + p.w < 0 ||
            x > W
        ) continue;


        /* خاک */
        ctx.fillStyle =
            wd.ground;

        roundRect(
            x,
            p.y,
            p.w,
            p.h,
            8
        );

        ctx.fill();


        /* چمن */
        ctx.fillStyle =
            wd.grass;

        roundRect(
            x,
            p.y,
            p.w,
            11,
            5
        );

        ctx.fill();


        /* جزئیات */
        if (world === 0) {

            ctx.fillStyle =
                "rgba(255,255,255,.12)";

            for (
                let i = 0;
                i < Math.floor(p.w / 40);
                i++
            ) {

                ctx.fillRect(
                    x + i * 40 + 10,
                    p.y + 25,
                    7,
                    4
                );
            }
        }
    }
}


function roundRect(
    x,
    y,
    w,
    h,
    r
) {

    ctx.beginPath();

    ctx.roundRect(
        x,
        y,
        w,
        h,
        r
    );
}


/* =========================
   PLAYER
   ========================= */

function drawPlayer() {

    if (!player)
        return;


    if (
        player.inv > 0 &&
        Math.floor(player.inv / 6) % 2 === 0
    ) {
        return;
    }


    const x =
        player.x - camera;

    const y =
        player.y;


    ctx.save();


    /* سایه */
    ctx.fillStyle =
        "rgba(0,0,0,.25)";

    ctx.beginPath();

    ctx.ellipse(
        x + 22,
        y + 68,
        25,
        6,
        0,
        0,
        Math.PI * 2
    );

    ctx.fill();


    /* مو */
    ctx.fillStyle = "#3b2418";

    ctx.beginPath();

    ctx.arc(
        x + 22,
        y + 18,
        20,
        0,
        Math.PI * 2
    );

    ctx.fill();


    /* صورت */
    ctx.fillStyle = "#f3bd96";

    ctx.beginPath();

    ctx.arc(
        x + 22,
        y + 23,
        15,
        0,
        Math.PI * 2
    );

    ctx.fill();


    /* موهای کنار */
    ctx.fillStyle = "#3b2418";

    ctx.fillRect(
        x + 7,
        y + 7,
        8,
        23
    );

    ctx.fillRect(
        x + 29,
        y + 7,
        8,
        23
    );


    /* کلاه قرمز */
    ctx.fillStyle = "#e53935";

    ctx.beginPath();

    ctx.arc(
        x + 22,
        y + 8,
        18,
        Math.PI,
        Math.PI * 2
    );

    ctx.fill();


    /* قارچ روی کلاه */
    ctx.fillStyle = "#fff";

    ctx.beginPath();

    ctx.arc(
        x + 22,
        y + 7,
        5,
        0,
        Math.PI * 2
    );

    ctx.fill();


    /* چشم‌ها */
    ctx.fillStyle = "#222";

    ctx.beginPath();

    ctx.arc(
        x + 17,
        y + 23,
        2.5,
        0,
        Math.PI * 2
    );

    ctx.arc(
        x + 28,
        y + 23,
        2.5,
        0,
        Math.PI * 2
    );

    ctx.fill();


    /* بدن */
    ctx.fillStyle = "#e64a5f";

    roundRect(
        x + 7,
        y + 37,
        30,
        23,
        7
    );

    ctx.fill();


    /* لباس آبی */
    ctx.fillStyle = "#3978c9";

    ctx.fillRect(
        x + 12,
        y + 40,
        20,
        20
    );


    /* دست‌ها */
    ctx.fillStyle = "#f3bd96";

    ctx.fillRect(
        x + 1,
        y + 40,
        8,
        17
    );

    ctx.fillRect(
        x + 35,
        y + 40,
        8,
        17
    );


    /* پاها */
    ctx.fillStyle = "#26364e";

    const step =
        player.vx !== 0
            ? Math.sin(player.anim) * 3
            : 0;

    ctx.fillRect(
        x + 10,
        y + 58 + step,
        9,
        11
    );

    ctx.fillRect(
        x + 26,
        y + 58 - step,
        9,
        11
    );


    /* کفش */
    ctx.fillStyle = "#e53935";

    ctx.fillRect(
        x + 7,
        y + 67 + step,
        14,
        5
    );

    ctx.fillRect(
        x + 25,
        y + 67 - step,
        14,
        5
    );


    /* سپر هنگام آسیب‌ناپذیری */
    if (player.inv > 40) {

        ctx.strokeStyle =
            "#7ee8ff";

        ctx.lineWidth = 4;

        ctx.beginPath();

        ctx.arc(
            x + 22,
            y + 36,
            40,
            0,
            Math.PI * 2
        );

        ctx.stroke();
    }


    ctx.restore();
}


/* =========================
   COINS & ITEMS
   ========================= */

function drawItems() {

    for (const c of coins) {

        if (c.got)
            continue;


        const x =
            c.x - camera;

        const scale =
            0.75 +
            Math.abs(Math.cos(c.angle)) * 0.25;


        ctx.save();

        ctx.translate(
            x,
            c.y
        );

        ctx.scale(
            scale,
            1
        );


        ctx.fillStyle =
            "#ffd42a";

        ctx.beginPath();

        ctx.arc(
            0,
            0,
            13,
            0,
            Math.PI * 2
        );

        ctx.fill();


        ctx.strokeStyle =
            "#b87900";

        ctx.lineWidth = 3;

        ctx.stroke();


        ctx.fillStyle =
            "#fff5a6";

        ctx.beginPath();

        ctx.arc(
            -4,
            -5,
            3,
            0,
            Math.PI * 2
        );

        ctx.fill();


        ctx.restore();
    }


    /* قلب */
    for (const h of hearts) {

        if (h.got)
            continue;

        ctx.font =
            "30px Arial";

        ctx.fillText(
            "❤️",
            h.x - camera - 15,
            h.y + 10
        );
    }


    /* تیر */
    for (const a of ammoItems) {

        if (a.got)
            continue;

        ctx.font =
            "26px Arial";

        ctx.fillText(
            "🔫",
            a.x - camera - 13,
            a.y + 10
        );
    }
}


/* =========================
   ENEMIES
   ========================= */

function drawEnemy(e) {

    if (!e.alive)
        return;


    const x =
        e.x - camera;

    const y =
        e.y;


    const bob =
        Math.sin(e.anim) * 2;


    ctx.save();


    /* حلزون */
    if (e.type === "snail") {

        ctx.fillStyle =
            "#b7774d";

        ctx.beginPath();

        ctx.ellipse(
            x + 23,
            y + 31 + bob,
            25,
            14,
            0,
            0,
            Math.PI * 2
        );

        ctx.fill();


        ctx.fillStyle =
            "#8050a5";

        ctx.beginPath();

        ctx.arc(
            x + 22,
            y + 22 + bob,
            20,
            0,
            Math.PI * 2
        );

        ctx.fill();


        ctx.strokeStyle =
            "#4f2f70";

        ctx.lineWidth = 3;

        ctx.beginPath();

        ctx.arc(
            x + 22,
            y + 22 + bob,
            10,
            0,
            Math.PI * 1.7
        );

        ctx.stroke();


        ctx.fillStyle =
            "#f2c09a";

        ctx.fillRect(
            x + 39,
            y + 7 + bob,
            4,
            15
        );

        ctx.fillRect(
            x + 49,
            y + 7 + bob,
            4,
            15
        );
    }


    /* زنبور */
    else if (e.type === "bee") {

        ctx.fillStyle =
            "rgba(255,255,255,.75)";

        ctx.beginPath();

        ctx.ellipse(
            x + 12,
            y + 15 + bob,
            14,
            9,
            -.4,
            0,
            Math.PI * 2
        );

        ctx.fill();


        ctx.beginPath();

        ctx.ellipse(
            x + 34,
            y + 15 + bob,
            14,
            9,
            .4,
            0,
            Math.PI * 2
        );

        ctx.fill();


        ctx.fillStyle =
            "#ffc928";

        ctx.beginPath();

        ctx.ellipse(
            x + 23,
            y + 27 + bob,
            21,
            16,
            0,
            0,
            Math.PI * 2
        );

        ctx.fill();


        ctx.strokeStyle =
            "#3d2b13";

        ctx.lineWidth = 5;

        ctx.beginPath();

        ctx.moveTo(
            x + 11,
            y + 21 + bob
        );

        ctx.lineTo(
            x + 35,
            y + 32 + bob
        );

        ctx.stroke();


        ctx.fillStyle = "#222";

        ctx.beginPath();

        ctx.arc(
            x + 17,
            y + 24 + bob,
            2,
            0,
            Math.PI * 2
        );

        ctx.fill();
    }


    /* لاک پشت */
    else if (e.type === "turtle") {

        ctx.fillStyle =
            "#287d48";

        ctx.beginPath();

        ctx.ellipse(
            x + 22,
            y + 29 + bob,
            26,
            18,
            0,
            0,
            Math.PI * 2
        );

        ctx.fill();


        ctx.fillStyle =
            "#67b95c";

        ctx.beginPath();

        ctx.arc(
            x + 46,
            y + 27 + bob,
            10,
            0,
            Math.PI * 2
        );

        ctx.fill();


        ctx.strokeStyle =
            "#174f2b";

        ctx.lineWidth = 3;

        ctx.beginPath();

        ctx.arc(
            x + 22,
            y + 29 + bob,
            14,
            0,
            Math.PI * 2
        );

        ctx.stroke();
    }


    /* برفی */
    else if (e.type === "penguin") {

        ctx.fillStyle =
            "#263746";

        ctx.beginPath();

        ctx.ellipse(
            x + 22,
            y + 27,
            20,
            28,
            0,
            0,
            Math.PI * 2
        );

        ctx.fill();


        ctx.fillStyle = "#fff";

        ctx.beginPath();

        ctx.ellipse(
            x + 22,
            y + 31,
            12,
            17,
            0,
            0,
            Math.PI * 2
        );

        ctx.fill();


        ctx.fillStyle =
            "#ffad24";

        ctx.fillRect(
            x + 16,
            y + 24,
            13,
            6
        );
    }


    else if (e.type === "sheep") {

        ctx.fillStyle =
            "#fff";

        ctx.beginPath();

        ctx.arc(
            x + 15,
            y + 24,
            15,
            0,
            Math.PI * 2
        );

        ctx.arc(
            x + 30,
            y + 20,
            16,
            0,
            Math.PI * 2
        );

        ctx.arc(
            x + 43,
            y + 27,
            13,
            0,
            Math.PI * 2
        );

        ctx.fill();


        ctx.fillStyle =
            "#30343b";

        ctx.beginPath();

        ctx.arc(
            x + 45,
            y + 25,
            9,
            0,
            Math.PI * 2
        );

        ctx.fill();
    }


    else if (e.type === "snowball") {

        ctx.fillStyle = "#fff";

        ctx.beginPath();

        ctx.arc(
            x + 22,
            y + 23,
            22,
            0,
            Math.PI * 2
        );

        ctx.fill();


        ctx.strokeStyle =
            "#a6dcff";

        ctx.stroke();
    }


    /* دریا */
    else if (e.type === "fish") {

        ctx.fillStyle =
            "#ff6b73";

        ctx.beginPath();

        ctx.ellipse(
            x + 25,
            y + 25,
            24,
            14,
            0,
            0,
            Math.PI * 2
        );

        ctx.fill();


        ctx.beginPath();

        ctx.moveTo(
            x + 4,
            y + 25
        );

        ctx.lineTo(
            x - 14,
            y + 10
        );

        ctx.lineTo(
            x - 14,
            y + 40
        );

        ctx.closePath();

        ctx.fill();
    }


    else if (e.type === "bubble") {

        ctx.strokeStyle =
            "#d9ffff";

        ctx.lineWidth = 5;

        ctx.beginPath();

        ctx.arc(
            x + 22,
            y + 22,
            19,
            0,
            Math.PI * 2
        );

        ctx.stroke();
    }


    else if (e.type === "crab") {

        ctx.fillStyle =
            "#ef5350";

        ctx.beginPath();

        ctx.arc(
            x + 23,
            y + 25,
            20,
            0,
            Math.PI * 2
        );

        ctx.fill();
    }


    /* آتش */
    else if (e.type === "fire") {

        ctx.fillStyle =
            "#ff3d00";

        ctx.beginPath();

        ctx.moveTo(
            x + 22,
            y
        );

        ctx.lineTo(
            x + 45,
            y + 45
        );

        ctx.lineTo(
            x,
            y + 45
        );

        ctx.closePath();

        ctx.fill();


        ctx.fillStyle =
            "#ffd600";

        ctx.beginPath();

        ctx.arc(
            x + 22,
            y + 30,
            10,
            0,
            Math.PI * 2
        );

        ctx.fill();
    }


    else if (e.type === "lava") {

        ctx.fillStyle =
            "#ff5722";

        ctx.beginPath();

        ctx.arc(
            x + 22,
            y + 22,
            22,
            0,
            Math.PI * 2
        );

        ctx.fill();


        ctx.fillStyle =
            "#ffd000";

        ctx.beginPath();

        ctx.arc(
            x + 14,
            y + 15,
            5,
            0,
            Math.PI * 2
        );

        ctx.fill();
    }


    else {

        ctx.fillStyle =
            "#25252c";

        ctx.beginPath();

        ctx.arc(
            x + 22,
            y + 22,
            20,
            0,
            Math.PI * 2
        );

        ctx.fill();


        ctx.fillStyle =
            "#ff8b00";

        ctx.fillRect(
            x + 8,
            y + 9,
            28,
            8
        );
    }


    ctx.restore();
}


/* =========================
   FLAG
   ========================= */

function drawGoal() {

    const fx =
        goalX - camera;


    ctx.fillStyle =
        "#ddd";

    ctx.fillRect(
        fx,
        H - 270,
        8,
        145
    );


    ctx.fillStyle =
        "#e53935";

    ctx.beginPath();

    ctx.moveTo(
        fx + 8,
        H - 265
    );

    ctx.lineTo(
        fx + 85,
        H - 240
    );

    ctx.lineTo(
        fx + 8,
        H - 215
    );

    ctx.closePath();

    ctx.fill();


    ctx.fillStyle =
        "#fff";

    ctx.font =
        "22px Arial";

    ctx.fillText(
        "★",
        fx + 28,
        H - 238
    );
}


/* =========================
   DRAW
   ========================= */

function draw() {

    drawBackground();

    drawPlatforms();

    drawItems();


    for (const e of enemies) {

        drawEnemy(e);
    }


    /* گلوله‌ها */
    for (const s of shots) {

        ctx.fillStyle =
            "#fff";

        ctx.beginPath();

        ctx.arc(
            s.x - camera,
            s.y,
            6,
            0,
            Math.PI * 2
        );

        ctx.fill();


        ctx.fillStyle =
            "#ffcc33";

        ctx.beginPath();

        ctx.arc(
            s.x -
            camera -
            s.vx / 4,
            s.y,
            4,
            0,
            Math.PI * 2
        );

        ctx.fill();
    }


    drawParticles();

    drawPlayer();

    drawGoal();
}


/* =========================
   GAME LOOP
   ========================= */

function gameLoop() {

    update();

    draw();

    requestAnimationFrame(gameLoop);
}


/* =========================
   START GAME
   ========================= */

function startGame(
    selectedWorld = 0,
    selectedLevel = 1
) {

    world = selectedWorld;
    level = selectedLevel;

    treasureMode = false;

    createLevel();

    running = true;

    hideAllScreens();

    showMessage(
        `🌳 دنیای ${worlds[world].name} - مرحله ${level}`
    );
}


/* =========================
   MENU BUTTONS
   ========================= */

/* شروع بازی */
onClick(
    $("startGame", "startBtn"),
    () => startGame(0, 1)
);


/* انتخاب دنیا */
function openWorldMenu() {

    const screen =
        $("worldMenu", "worldSelect", "levels");

    if (!screen)
        return;

    showScreen(screen);

    renderWorlds();
}


/* ساخت دنیاها */
function renderWorlds() {

    const container =
        $("worldList", "worldGrid", "worldTabs");

    if (!container)
        return;


    container.innerHTML = "";


    worlds.forEach((wd, i) => {

        const button =
            document.createElement("button");

        button.className =
            "worldButton tab";

        button.textContent =
            `🌍 ${i + 1}. ${wd.name}`;


        button.addEventListener(
            "click",
            () => openLevelMenu(i)
        );


        container.appendChild(button);
    });
}


/* دکمه انتخاب مرحله */
onClick(
    $("worldSelectButton", "levelsBtn"),
    openWorldMenu
);


/* =========================
   LEVEL MENU
   ========================= */

function openLevelMenu(w) {

    world = w;

    const screen =
        $("levelMenu", "levelSelect");

    if (screen) {

        showScreen(screen);

        renderLevels();
        return;
    }


    /* اگر همان صفحه levels استفاده شود */
    const old =
        $("levels");

    if (old) {

        showScreen(old);

        renderLevels();
    }
}


function renderLevels() {

    const grid =
        $("levelGrid", "levelList");

    if (!grid)
        return;


    grid.innerHTML = "";


    for (
        let i = 1;
        i <= 10;
        i++
    ) {

        const number =
            world * 10 + i;


        const button =
            document.createElement("button");


        button.className =
            "levelButton levelBtn";


        const unlocked =
            number <= save.unlocked;


        button.textContent =
            unlocked
                ? `⭐ ${world + 1}-${i}`
                : `🔒 ${world + 1}-${i}`;


        if (!unlocked) {

            button.classList.add(
                "locked"
            );

        } else {

            button.addEventListener(
                "click",
                () => startGame(world, i)
            );
        }


        grid.appendChild(button);
    }
}


/* =========================
   CHARACTER MENU
   ========================= */

function openCharacters() {

    const screen =
        $("characterMenu", "characters");

    if (!screen)
        return;


    showScreen(screen);


    const grid =
        $("characterGrid");


    if (!grid)
        return;


    grid.innerHTML = "";


    const characters = [
        {
            name: "الینا",
            icon: "👧",
            cost: 0
        },
        {
            name: "جنگجو",
            icon: "🧝‍♀️",
            cost: 1
        },
        {
            name: "ماجراجو",
            icon: "🧑‍🚀",
            cost: 2
        },
        {
            name: "قهرمان",
            icon: "🦸‍♀️",
            cost: 4
        },
        {
            name: "نینجا",
            icon: "🥷",
            cost: 6
        }
    ];


    characters.forEach(
        (character, i) => {

            const card =
                document.createElement("div");

            card.className =
                "charCard";


            const owned =
                save.owned.includes(i);


            card.innerHTML = `
                <div class="charIcon">
                    ${character.icon}
                </div>

                <b>
                    ${character.name}
                </b>

                <small>
                    ${
                        character.cost === 0
                            ? "رایگان"
                            : character.cost + " 💎"
                    }
                </small>

                <button>
                    ${
                        owned
                            ? "انتخاب"
                            : "خرید"
                    }
                </button>
            `;


            card
                .querySelector("button")
                .addEventListener(
                    "click",
                    () => {

                        if (owned) {

                            save.char = i;

                            saveGame();

                            showMessage(
                                "👧 شخصیت انتخاب شد!"
                            );

                            openCharacters();

                        } else if (
                            save.gems >=
                            character.cost
                        ) {

                            save.gems -=
                                character.cost;

                            save.owned.push(i);

                            save.char = i;

                            saveGame();

                            openCharacters();

                        } else {

                            showMessage(
                                "💎 الماس کافی نیست!"
                            );
                        }
                    }
                );


            grid.appendChild(card);
        }
    );
}


onClick(
    $("charactersButton", "charsBtn"),
    openCharacters
);


/* =========================
   BACK BUTTONS
   ========================= */

document
    .querySelectorAll(
        ".backBtn, .backButton"
    )
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                running = false;

                showScreen(
                    menuScreen
                );
            }
        );
    });


/* =========================
   NEXT LEVEL
   ========================= */

onClick(
    $("nextBtn", "nextLevelButton"),
    () => {

        if (level < 10) {

            startGame(
                world,
                level + 1
            );

        } else if (world < 3) {

            startGame(
                world + 1,
                1
            );

        } else {

            showScreen(
                treasureScreen ||
                finishScreen
            );
        }
    }
);


/* =========================
   MAP BUTTON
   ========================= */

onClick(
    $("mapBtn", "mapButton"),
    openWorldMenu
);

onClick(
    $("gameMapBtn"),
    openWorldMenu
);


/* =========================
   TREASURE
   ========================= */

onClick(
    $("treasureBtn", "treasureStart"),
    () => {

        treasureMode = true;

        world = 3;
        level = 10;

        createLevel();

        goalX =
            player.x + 2500;


        for (
            let i = 0;
            i < 25;
            i++
        ) {

            coins.push({

                x:
                    player.x +
                    250 +
                    i * 85,

                y:
                    H -
                    220 -
                    (i % 3) * 80,

                got: false,

                angle: 0
            });
        }


        hideAllScreens();

        running = true;

        showMessage(
            "💰 مرحله گنج شروع شد!"
        );
    }
);


/* =========================
   RETRY
   ========================= */

onClick(
    $("retryBtn", "restartBtn"),
    () => {

        save.lives = 3;

        saveGame();

        startGame(
            world,
            level
        );
    }
);


/* =========================
   HOME
   ========================= */

onClick(
    $("homeBtn", "gameOverHome", "winHomeBtn"),
    () => {

        running = false;

        showScreen(menuScreen);
    }
);


/* =========================
   INITIALIZE
   ========================= */

updateHUD();

showScreen(menuScreen);

gameLoop();
