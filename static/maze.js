document.addEventListener('DOMContentLoaded', () => {
  const mazeContainer = document.getElementById('mazeContainer');
  const generateBtn = document.getElementById('generateBtn');
  const startBtn = document.getElementById('startBtn');
  const solveBtn = document.getElementById('solveBtn');
  const resetBtn = document.getElementById('resetBtn');
  const sizeSelect = document.getElementById('sizeSelect');
  const diffSelect = document.getElementById('difficultySelect');
  const timerEl = document.getElementById('timer');
  const statusEl = document.getElementById('status');

  const gameOverModal = document.getElementById('gameOverModal');
  const restartBtn = document.getElementById('restartBtn');
  const closeModalBtn = document.getElementById('closeModalBtn');

  const winModal = document.createElement('div');
  winModal.id = 'winModal';
  winModal.className = 'fixed inset-0 z-50 hidden items-center justify-center bg-black/40';
  winModal.innerHTML = `
    <div class="bg-green-100 rounded-xl p-6 shadow-lg w-80 text-center">
      <h2 class="text-2xl font-bold text-green-700 mb-2">🎉 Congratulations!</h2>
      <p class="text-sm text-gray-800 mb-4">You found the correct path to the cheese!</p>
      <div class="flex justify-center gap-3">
        <button id="newGameBtn" class="bg-teal-900 text-white px-4 py-2 rounded">New Game</button>
      </div>
    </div>`;
  document.body.appendChild(winModal);
  const newGameBtn = winModal.querySelector('#newGameBtn');

  if (!mazeContainer || !generateBtn || !startBtn || !solveBtn || !resetBtn || !sizeSelect || !diffSelect || !timerEl || !statusEl || !gameOverModal) {
    console.error('Missing DOM elements!');
    return;
  }

  let maze = [], solution = [];
  let animHandle = null, countdownHandle = null;
  let playerPos = [0, 0], manualMode = true;
  let timeLimit = 60; // will set dynamically

  const formatTime = s => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
  const setStatus = txt => statusEl.textContent = txt;

  function stopCountdown() { if (countdownHandle) { clearInterval(countdownHandle); countdownHandle=null; } }

  function startCountdown() {
    stopCountdown();
    let timeLeft = timeLimit;
    timerEl.textContent = formatTime(timeLeft);
    countdownHandle = setInterval(() => {
      timeLeft--;
      timerEl.textContent = formatTime(timeLeft);
      if (timeLeft <= 0) {
        stopCountdown();
        showGameOver();
      }
    }, 1000);
  }

  function showGameOver() {
    stopCountdown();
    setStatus('Game Over 💥');
    gameOverModal.classList.remove('hidden');
    gameOverModal.classList.add('flex');
  }
  function hideGameOver() {
    gameOverModal.classList.add('hidden');
    gameOverModal.classList.remove('flex');
  }
  function showWinModal() {
    winModal.classList.remove('hidden');
    winModal.classList.add('flex');
  }
  function hideWinModal() {
    winModal.classList.add('hidden');
    winModal.classList.remove('flex');
  }

  const isAdjacent = ([r1,c1],[r2,c2]) => Math.abs(r1-r2)+Math.abs(c1-c2)===1;

  function renderMaze() {
    mazeContainer.innerHTML='';
    const n = maze.length;
    if(n===0) return;
    mazeContainer.style.gridTemplateColumns=`repeat(${n}, auto)`;
    mazeContainer.style.width='fit-content';
    mazeContainer.style.margin='0 auto';

    for(let r=0;r<n;r++){
      for(let c=0;c<n;c++){
        const div = document.createElement('div');
        div.classList.add('maze-cell','rounded','border','flex','items-center','justify-center');
        div.dataset.r=r; div.dataset.c=c;

        if(maze[r][c]===1) div.classList.add('bg-cyan-400');
        else div.classList.add('bg-red-600','text-white');

        if(r===0 && c===0) div.classList.add('ring-2','ring-green-400');
        if(r===n-1 && c===n-1) div.classList.add('ring-2','ring-yellow-400');

        if(r===playerPos[0] && c===playerPos[1]){
          div.innerHTML='<span class="text-sm">🐀</span>';
          div.classList.remove('bg-cyan-400','bg-red-600');
          div.classList.add('bg-yellow-300');
        }

        div.addEventListener('click',()=>handleCellClick(r,c));
        mazeContainer.appendChild(div);
      }
    }
  }

  function handleCellClick(r,c){
    if(!manualMode) return;
    const [pr,pc]=playerPos;
    if(r===pr && c===pc) return;
    if(!isAdjacent([pr,pc],[r,c]) || maze[r][c]!==1) return showGameOver();

    playerPos=[r,c];
    renderMaze();

    if(r===maze.length-1 && c===maze.length-1){
      stopCountdown();
      setStatus('You reached the goal! 🧀 Click Solve to see path 🎉');
    }
  }

  async function fetchMaze(){
    const size = Number(sizeSelect.value)||10;
    const difficulty = diffSelect.value||'medium';
    setStatus('Generating...');
    const res = await fetch(`/generate?size=${size}&difficulty=${difficulty}`);
    if(!res.ok){ setStatus('Server error'); return; }
    const data = await res.json();
    maze = data.maze||[];
    solution = data.solution||[];
    playerPos=[0,0];
    manualMode=true;
    renderMaze();
    hideGameOver();
    hideWinModal();
    setStatus('Maze Ready 🌀');

    if(difficulty==='easy') timeLimit=90;
    else if(difficulty==='medium') timeLimit=60;
    else if(difficulty==='hard') timeLimit=40;
    timerEl.textContent = formatTime(timeLimit);
  }

  async function requestSolve(){
    const res = await fetch('/solve',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({maze})
    });
    if(!res.ok){ setStatus('Solve failed'); return []; }
    const data = await res.json();
    solution = data.solution||[];
    return solution;
  }

  function animateSolution(path){
    if(!path || path.length===0) return;
    manualMode=false;
    if(animHandle) clearInterval(animHandle);
    let i=0;
    setStatus('Animating path...');
    document.querySelectorAll('#mazeContainer [data-r]').forEach(el=>el.innerHTML='');
    animHandle = setInterval(()=>{
      if(i>=path.length){
        clearInterval(animHandle);
        animHandle=null;
        playerPos = path[path.length-1];
        renderMaze();
        setStatus('Path animation done!');
        manualMode=true;
        showWinModal();
        return;
      }
      const [r,c]=path[i];
      const cell=document.querySelector(`#mazeContainer [data-r='${r}'][data-c='${c}']`);
      if(cell){
        cell.classList.remove('bg-cyan-400','bg-red-600');
        cell.classList.add('bg-yellow-400');
      }
      if(i>0){
        const [pr,pc]=path[i-1];
        const prev=document.querySelector(`#mazeContainer [data-r='${pr}'][data-c='${pc}']`);
        if(prev){ prev.classList.remove('bg-yellow-400'); prev.classList.add('bg-green-500'); }
      }
      i++;
    },220);
  }

  generateBtn.addEventListener('click', async()=>{ stopCountdown(); hideGameOver(); hideWinModal(); await fetchMaze(); });
  startBtn.addEventListener('click', ()=>{ stopCountdown(); startCountdown(); setStatus('Find the path before time runs out! ⏱️'); });
  solveBtn.addEventListener('click', async()=>{
    if(playerPos[0]===maze.length-1 && playerPos[1]===maze.length-1){
      stopCountdown();
      const path = await requestSolve();
      animateSolution(path);
    } else {
      setStatus('Reach the end first to view the correct path!');
    }
  });

const hintBtn = document.getElementById('hintBtn');
let hintUsed = false; 

function animateHint(path){
  if(!path || path.length===0 || hintUsed) return;
  hintUsed = true;

  let speed = 100;
  const diff = diffSelect.value;
  if(diff==='easy') speed=200;
  else if(diff==='medium') speed=120;
  else if(diff==='hard') speed=80;

  let i=0;
  const originalPos = [...playerPos];

  const hintAnim = setInterval(()=>{
    if(i>=path.length){
      clearInterval(hintAnim);
      renderMaze();
      setStatus('Hint animation done!');
      return;
    }
    const [r,c] = path[i];
    const cell = document.querySelector(`#mazeContainer [data-r='${r}'][data-c='${c}']`);
    if(cell){
      cell.classList.remove('bg-cyan-500','bg-red-700');
      cell.classList.add('bg-yellow-900');
    }
    if(i>0){
      const [pr,pc] = path[i-1];
      const prev = document.querySelector(`#mazeContainer [data-r='${pr}'][data-c='${pc}']`);
      if(prev) prev.classList.remove('bg-yellow-700');
    }
    i++;
  }, speed);
}

hintBtn.addEventListener('click', async ()=>{
  if(!solution || solution.length===0){
    const path = await requestSolve();
    animateHint(path);
  } else {
    animateHint(solution);
  }
});

  resetBtn.addEventListener('click', ()=>{ solution=[]; renderMaze(); stopCountdown(); timerEl.textContent=formatTime(timeLimit); setStatus('Ready'); hideGameOver(); hideWinModal(); });

  restartBtn.addEventListener('click', async()=>{ hideGameOver(); stopCountdown(); await fetchMaze(); });
  closeModalBtn.addEventListener('click', ()=>{ hideGameOver(); setStatus('Ready'); });
  newGameBtn.addEventListener('click', async()=>{ hideWinModal(); await fetchMaze(); });

  (async function init(){ await fetchMaze(); })();
});