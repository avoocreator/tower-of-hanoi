const NUM_TOWERS = 5;
const NUM_DISKS = 5;
let towers = [[], [], [], [], []];
let isRunning = false;
let moveQueue = [];
let movesMade = 0;

const editor = document.getElementById('code-editor');
const consoleEl = document.getElementById('console');
const moveDisplay = document.getElementById('move-count');
const statusText = document.getElementById('status-text');

//kode di web
const defaultCode = `async function autoSolve() {
    const targetTower = 4;

    async function fastMove(disk, dest, forbidden = []) {
        let state = getTowers();
        let currentPos = -1;
        
        for (let i = 0; i < 5; i++) {
            if (state[i].includes(disk)) { currentPos = i; break; }
        }

        if (currentPos === dest) return;

        state = getTowers();
        const towerDisks = state[currentPos];
        const diskIndex = towerDisks.indexOf(disk);
        const disksAbove = towerDisks.slice(diskIndex + 1);
        
        if (disksAbove.length > 0) {
            for (let i = disksAbove.length - 1; i >= 0; i--) {
                const blocker = disksAbove[i];
                let helper = [0, 1, 2, 3, 4].find(idx => 
                    idx !== currentPos && 
                    idx !== dest && 
                    !forbidden.includes(idx)
                );
                
                if (helper === undefined) {
                    helper = [0, 1, 2, 3].find(idx => idx !== currentPos && idx !== dest);
                }

                await fastMove(blocker, helper, [currentPos, dest]);
            }
        }

        state = getTowers();
        const destTower = state[dest];
        if (destTower.length > 0 && destTower[destTower.length - 1] < disk) {
            const blockerAtDest = destTower[destTower.length - 1];
            let backup = [0, 1, 2, 3].find(idx => idx !== currentPos && idx !== dest);
            await fastMove(blockerAtDest, backup, [currentPos, dest]);
        }

        await move(currentPos, dest);
    }

    console.log("Greedy Algorithm v2.0: Stabilizing...");
    
    for (let d = 5; d >= 1; d--) {
        await fastMove(d, targetTower);
    }
    
    console.log("Puzzle Terpecahkan");
}

await autoSolve();`;
function init() {
    editor.value = defaultCode;
    updateLN();
    shuffleGame();

    editor.addEventListener('input', updateLN);
    document.getElementById('run-btn').onclick = runCode;
    document.getElementById('reset-btn').onclick = shuffleGame;
}

function updateLN() {
    const lines = editor.value.split('\n').length;
    document.getElementById('ln').innerHTML = Array.from({ length: lines }, (_, i) => i + 1).join('<br>');
}

function log(msg, type = "") {
    const d = document.createElement('div');
    d.className = type ? `console-${type}` : "";
    d.innerText = `> ${msg}`;
    consoleEl.appendChild(d);
    consoleEl.scrollTop = consoleEl.scrollHeight;
}

function shuffleGame() {
    if (isRunning) return;
    towers = [[], [], [], [], []];
    moveQueue = [];
    movesMade = 0;
    moveDisplay.innerText = "0";
    statusText.innerText = "READY";

    for (let d = NUM_DISKS; d > 0; d--) {
        const randomTower = Math.floor(Math.random() * NUM_TOWERS);
        towers[randomTower].push(d);
    }

    render();
    log("Towers re-shuffled. Find your way to Tower 4!", "log");
}

function render() {
    document.querySelectorAll('.disk').forEach(d => d.remove());
    towers.forEach((tower, tIdx) => {
        const pilar = document.getElementById(`pilar-${tIdx}`);
        tower.forEach((size, dIdx) => {
            const disk = document.createElement('div');
            disk.className = 'disk';
            disk.id = `disk-${size}`;
            disk.style.width = `${35 + (size * 12)}px`;
            disk.style.bottom = `${dIdx * 24}px`;
            disk.style.filter = `hue-rotate(${size * 25}deg)`;
            pilar.appendChild(disk);
        });
    });
}

function getTowers() { return JSON.parse(JSON.stringify(towers)); }
function move(from, to) { moveQueue.push({ from, to }); }

async function runCode() {
    if (isRunning) return;
    moveQueue = [];
    const code = editor.value;

    try {
        isRunning = true;
        statusText.innerText = "EXECUTING";
        
        const runner = new Function('move', 'getTowers', 'console', `
            async function userScript() {
                ${code}
            }
            return userScript();
        `);

        const syncMove = async (from, to) => {
            if (!isRunning) return;
            
            const disk = towers[from][towers[from].length - 1];
            const targetTop = towers[to][towers[to].length - 1];

            if (!disk) {
                log(`Error: Tower ${from} kosong!`, "error");
                return;
            }

            if (targetTop && disk > targetTop) {
                log(`Illegal Move: Disk ${disk} di atas ${targetTop}!`, "error");
                isRunning = false;
                throw new Error("Illegal Move");
            }

            await animate(from, to, disk);
            towers[from].pop();
            towers[to].push(disk);
            movesMade++;
            moveDisplay.innerText = movesMade;
            
            const speed = 1100 - document.getElementById('speed').value;
            await new Promise(r => setTimeout(r, speed));
        };

        await runner(syncMove, getTowers, { log: (m) => log(m) });
        
        isRunning = false;
        statusText.innerText = "IDLE";
        checkWin();

    } catch (e) {
        isRunning = false;
        statusText.innerText = "HALTED";
        if(e.message !== "Illegal Move") log(e.message, "error");
    }
}

async function processQueue() {
    const speed = 1100 - document.getElementById('speed').value;

    for (let m of moveQueue) {
        const { from, to } = m;

        if (towers[from].length === 0) {
            log(`Error: Tiang ${from} kosong! Melewati perintah.`, "error");
            continue; 
        }

        const disk = towers[from][towers[from].length - 1];
        const targetTop = towers[to][towers[to].length - 1];

        if (targetTop && disk > targetTop) {
            log(`Illegal Move Terdeteksi: Disk ${disk} tidak bisa di atas ${targetTop} (Tower ${to})`, "error");
            isRunning = false;
            statusText.innerText = "HALTED";
            return; // Hentikan total jika melanggar aturan dasar
        }

        await animate(from, to, disk);

        towers[from].pop();
        towers[to].push(disk);
        movesMade++;
        moveDisplay.innerText = movesMade;

        await new Promise(r => setTimeout(r, speed));
    }

    isRunning = false;
    statusText.innerText = "IDLE";
    checkWin();
}

function animate(from, to, size) {
    return new Promise(resolve => {
        const el = document.getElementById(`disk-${size}`);
        const fP = document.getElementById(`pilar-${from}`);
        const tP = document.getElementById(`pilar-${to}`);

        el.classList.add('moving');
        el.style.bottom = "280px"; // Lift

        setTimeout(() => {
            const rectF = fP.getBoundingClientRect();
            const rectT = tP.getBoundingClientRect();
            el.style.transform = `translateX(${rectT.left - rectF.left}px)`;

            setTimeout(() => {
                el.style.transform = `translateX(0)`;
                tP.appendChild(el);
                el.style.bottom = `${towers[to].length * 24}px`;

                setTimeout(() => {
                    el.classList.remove('moving');
                    resolve();
                }, 300);
            }, 300);
        }, 300);
    });
}

function checkWin() {
    if (towers[4].length === NUM_DISKS) {
        log("PUZZLE SOLVED! All disks on Tower 4.", "success");
        flashNotif("MISSION SUCCESS", "#27c93f");
    }
}

function flashNotif(msg, color) {
    const n = document.getElementById('notif');
    n.innerText = msg;
    n.style.background = color;
    n.style.display = 'block';
    setTimeout(() => n.style.display = 'none', 3000);
}

window.onload = init;