const NUM_TOWERS = 5;
const NUM_DISKS = 5;
let towers = [[], [], [], [], []];
let selectedDisk = null;
let moves = 0;
let timerSeconds = 0;
let timerInterval = null;
let isSolving = false;

const board = document.getElementById('game-board');
const moveDisplay = document.getElementById('move-count');
const timerDisplay = document.getElementById('timer');
const statusMsg = document.getElementById('status-msg');

window.onload = initGame;

function initGame() {
    clearInterval(timerInterval);
    towers = [[], [], [], [], []];
    moves = 0;
    timerSeconds = 0;
    isSolving = false;
    selectedDisk = null;

    moveDisplay.innerText = "0";
    timerDisplay.innerText = "00:00";
    statusMsg.innerText = "SHUFFLING SYSTEM...";
    document.getElementById('solve-btn').disabled = false;

    generateRandomStart();
    startTimer();
}

// Acak
function generateRandomStart() {
    board.innerHTML = '';
    for (let i = 0; i < NUM_TOWERS; i++) {
        const towerEl = document.createElement('div');
        towerEl.className = 'tower-pilar';
        towerEl.dataset.index = i;
        towerEl.onclick = () => handleTowerClick(i);
        board.appendChild(towerEl);
    }

    for (let d = NUM_DISKS; d > 0; d--) {
        const randomTower = Math.floor(Math.random() * NUM_TOWERS);
        towers[randomTower].push(d);
    }

// Ulang jika tersusun (jarang harusnya)
    if (checkWinCondition()) {
        generateRandomStart();
    } else {
        renderDisks();
        statusMsg.innerText = "SYSTEM READY: SELESAIKAN PUZZLE";
    }
}

function renderDisks() {
    document.querySelectorAll('.disk').forEach(d => d.remove());
    towers.forEach((tower, tIdx) => {
        const towerEl = board.children[tIdx];
        tower.forEach((diskSize, dIdx) => {
            const diskEl = document.createElement('div');
            diskEl.className = 'disk';
            diskEl.id = `disk-${diskSize}`;
            diskEl.style.width = `${40 + (diskSize * 15)}px`;
            diskEl.style.bottom = `${dIdx * 28}px`;
            diskEl.style.filter = `hue-rotate(${diskSize * 20}deg)`;
            towerEl.appendChild(diskEl);
        });
    });
}

function handleTowerClick(towerIndex) {
    if (isSolving) return;

    if (selectedDisk === null) {
        if (towers[towerIndex].length === 0) return;

        selectedDisk = {
            size: towers[towerIndex][towers[towerIndex].length - 1],
            fromIndex: towerIndex
        };

        document.getElementById(`disk-${selectedDisk.size}`).classList.add('selected');
        board.children[towerIndex].classList.add('highlight');
    } else {
        const targetTower = towers[towerIndex];
        const diskSize = selectedDisk.size;

        if (targetTower.length > 0 && targetTower[targetTower.length - 1] < diskSize) {
            statusMsg.innerText = "ILLEGAL MOVE: OVERSIZE LOAD";
            setTimeout(() => statusMsg.innerText = "", 1500);
            resetSelection();
            return;
        }

        towers[selectedDisk.fromIndex].pop();
        towers[towerIndex].push(diskSize);
        moves++;
        moveDisplay.innerText = moves;

        resetSelection();
        renderDisks();

        if (checkWinCondition()) {
            triggerWin();
        }
    }
}

function resetSelection() {
    selectedDisk = null;
    document.querySelectorAll('.tower-pilar').forEach(t => t.classList.remove('highlight'));
    document.querySelectorAll('.disk').forEach(d => d.classList.remove('selected'));
}

function checkWinCondition() {
    for (let i = 0; i < NUM_TOWERS; i++) {
        if (towers[i].length === NUM_DISKS) {
            const isCorrectOrder = towers[i].every((val, index) => val === NUM_DISKS - index);
            if (isCorrectOrder) return true;
        }
    }
    return false;
}

function triggerWin() {
    clearInterval(timerInterval);
    document.getElementById('final-moves').innerText = moves;
    document.getElementById('final-time').innerText = timerDisplay.innerText;
    setTimeout(() => {
        document.getElementById('win-modal').style.display = 'flex';
    }, 500);
}

// Nyelesain otomatis ke tiang akhir
// Ganti fungsi startAutoSolve dan solveFromCurrentState di script-play.js

async function startAutoSolve() {
    if (isSolving) return;
    isSolving = true;
    document.getElementById('solve-btn').disabled = true;
    statusMsg.innerText = "GREEDY AI: MENCARI JALAN TERPENDEK...";

    const targetTower = NUM_TOWERS - 1;

    try {
        // Kita loop dari disk terbesar (5) ke terkecil (1)
        // Ini memastikan disk besar langsung 'gas' ke target jika memungkinkan
        for (let i = NUM_DISKS; i >= 1; i--) {
            if (!isSolving) break;
            await greedySmartMove(i, targetTower);
        }

        statusMsg.innerText = "MISSION SUCCESS.";
        setTimeout(() => triggerWin(), 500);
        
    } catch (error) {
        console.error(error);
        statusMsg.innerText = "AI ERROR: " + error;
    } finally {
        isSolving = false;
    }
}

// Fungsi Greedy baru: Hanya memindahkan yang benar-benar menghalangi
async function greedySmartMove(diskSize, dest) {
    if (!isSolving) return;

    let currentPos = -1;
    for (let i = 0; i < NUM_TOWERS; i++) {
        if (towers[i].includes(diskSize)) {
            currentPos = i;
            break;
        }
    }

    if (currentPos === dest) return;

    // 1. CEK PENGHALANG: Apakah ada disk di atas disk target kita?
    const disksAbove = towers[currentPos].slice(towers[currentPos].indexOf(diskSize) + 1);
    if (disksAbove.length > 0) {
        // Pindahkan penghalang ke tiang yang paling kosong
        for (let j = disksAbove.length - 1; j >= 0; j--) {
            const blocker = disksAbove[j];
            // Cari tiang bantuan yang bukan asal dan bukan tujuan
            let bestHelper = [0, 1, 2, 3].filter(idx => idx !== currentPos && idx !== dest)
                .sort((a, b) => towers[a].length - towers[b].length)[0];
            
            await greedySmartMove(blocker, bestHelper);
        }
    }

    // 2. CEK TIANG TUJUAN: Apakah ada disk kecil yang menghalangi di sana?
    const targetTowerContent = towers[dest];
    if (targetTowerContent.length > 0 && targetTowerContent[targetTowerContent.length - 1] < diskSize) {
        const blockerAtDest = targetTowerContent[targetTowerContent.length - 1];
        let backupTower = [0, 1, 2, 3].find(idx => idx !== currentPos && idx !== dest);
        await greedySmartMove(blockerAtDest, backupTower);
    }

    // 3. EKSEKUSI: Langsung pindah ke tujuan
    await moveDiskVisual(currentPos, dest);
}

// gerak animasi
async function moveDiskVisual(from, to) {
    return new Promise((resolve, reject) => {
        if (!isSolving) return reject("Stopped");

        const diskSize = towers[from][towers[from].length - 1];
        const diskEl = document.getElementById(`disk-${diskSize}`);
        const fromTower = board.children[from];
        const toTower = board.children[to];

        if (!diskEl) return resolve();

        // 1. Fase Angkat (Lift)
        diskEl.classList.add('moving-ai');
        diskEl.style.bottom = "280px"; 

        setTimeout(() => {
            // 2. Fase Geser (Slide)
            const rectFrom = fromTower.getBoundingClientRect();
            const rectTo = toTower.getBoundingClientRect();
            const distance = rectTo.left - rectFrom.left;
            
            diskEl.style.transform = `translateX(${distance}px)`;

            setTimeout(() => {
                // 3. Fase Turun (Drop)
                // Pindahkan elemen di DOM tanpa merusak visual
                diskEl.style.transform = "translateX(0)";
                toTower.appendChild(diskEl);
                
                // Update logika data
                const disk = towers[from].pop();
                towers[to].push(disk);
                
                // Set posisi final di tiang baru
                diskEl.style.bottom = `${(towers[to].length - 1) * 28}px`;

                setTimeout(() => {
                    diskEl.classList.remove('moving-ai');
                    moves++;
                    moveDisplay.innerText = moves;
                    resolve();
                }, 400);
            }, 400);
        }, 400);
    });
}

function startTimer() {
    timerInterval = setInterval(() => {
        timerSeconds++;
        const mins = Math.floor(timerSeconds / 60).toString().padStart(2, '0');
        const secs = (timerSeconds % 60).toString().padStart(2, '0');
        timerDisplay.innerText = `${mins}:${secs}`;
    }, 1000);
}

function closeModal() {
    document.getElementById('win-modal').style.display = 'none';
    initGame();
}

function goToNextLevel() {
    statusMsg.innerText = "LOADING NEXT PHASE...";
    window.location.href = "coding.html"; 
}