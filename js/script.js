document.addEventListener('DOMContentLoaded', () => {
    let audioCtx = null;
    let musicNodes = [];
    let currentTheme = 'theme-green';
    let musicEnabled = true;

    // Undo State Tracking (Now Infinite)
    let undoStack = [];

    const backgroundImages = [
        'https://picsum.photos/id/111/200/300', 
        'https://picsum.photos/id/10/200/300',  
        'https://picsum.photos/id/13/200/300',  
        'https://picsum.photos/id/164/200/300', 
        'https://picsum.photos/id/28/200/300'   
    ];
    let currentDeckImage = '';

    const stock = document.getElementById('stock'); const waste = document.getElementById('waste');
    const scoreEl = document.getElementById('score'); const timerEl = document.getElementById('timer');
    const shufflesEl = document.getElementById('shuffles'); const probEl = document.getElementById('prob');
    const musicBtn = document.getElementById('music-btn'); 
    const hintBtn = document.getElementById('hint-btn');
    const undoBtn = document.getElementById('undo-btn');
    const endOverlay = document.getElementById('end-overlay');

    // --- AUDIO SYSTEM ---
    function initAudio() {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();
    }

    musicBtn.addEventListener('click', () => {
        musicEnabled = !musicEnabled;
        musicBtn.innerText = musicEnabled ? '🔊' : '🔇';
        if (musicEnabled) playGameMusic(); else stopGameMusic();
    });

    function playGameMusic() {
        if (!audioCtx || !musicEnabled) return;
        stopGameMusic();
        
        const freqs = [130.81, 164.81, 196.00, 246.94]; 
        
        freqs.forEach((freq, index) => {
            const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain();
            osc.type = 'sine'; osc.frequency.value = freq;
            const lfo = audioCtx.createOscillator(); const lfoGain = audioCtx.createGain();
            lfo.type = 'sine'; lfo.frequency.value = 0.1 + (index * 0.02); 
            lfo.connect(lfoGain); lfoGain.connect(gain.gain);
            lfoGain.gain.value = 0.05; lfo.start();
            gain.gain.value = 0.05; 
            osc.connect(gain); gain.connect(audioCtx.destination);
            osc.start(); 
            musicNodes.push({osc, gain, lfo});
        });
    }

    function stopGameMusic() {
        musicNodes.forEach(node => { node.osc.stop(); node.lfo.stop(); node.osc.disconnect(); node.gain.disconnect(); node.lfo.disconnect(); });
        musicNodes = [];
    }

    function playCoinSound() {
        if (!audioCtx || !musicEnabled) return;
        const osc = audioCtx.createOscillator(); const gainNode = audioCtx.createGain();
        osc.connect(gainNode); gainNode.connect(audioCtx.destination);
        osc.type = 'square';
        osc.frequency.setValueAtTime(987.77, audioCtx.currentTime); 
        osc.frequency.setValueAtTime(1318.51, audioCtx.currentTime + 0.1); 
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        osc.start(audioCtx.currentTime); osc.stop(audioCtx.currentTime + 0.3);
    }

    function playDrawSound() {
        if (!audioCtx || !musicEnabled) return;
        const osc = audioCtx.createOscillator(); const gainNode = audioCtx.createGain();
        osc.connect(gainNode); gainNode.connect(audioCtx.destination);
        osc.type = 'triangle'; 
        osc.frequency.setValueAtTime(400, audioCtx.currentTime); 
        osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.1); 
        gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        osc.start(audioCtx.currentTime); osc.stop(audioCtx.currentTime + 0.1);
    }

    function playErrorSound() {
        if (!audioCtx || !musicEnabled) return;
        const osc = audioCtx.createOscillator(); const gainNode = audioCtx.createGain();
        osc.connect(gainNode); gainNode.connect(audioCtx.destination);
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, audioCtx.currentTime); 
        osc.frequency.exponentialRampToValueAtTime(150, audioCtx.currentTime + 0.15);
        gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
        osc.start(audioCtx.currentTime); osc.stop(audioCtx.currentTime + 0.15);
    }

    function playVictorySound() {
        if (!audioCtx || !musicEnabled) return;
        const notes = [523.25, 659.25, 783.99, 1046.50]; 
        let startTime = audioCtx.currentTime;
        notes.forEach((freq, i) => {
            const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain();
            osc.connect(gain); gain.connect(audioCtx.destination);
            osc.type = 'square'; osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.1, startTime + i * 0.15);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + i * 0.15 + 0.2);
            osc.start(startTime + i * 0.15); osc.stop(startTime + i * 0.15 + 0.2);
        });
    }

    function playFailSound() {
        if (!audioCtx || !musicEnabled) return;
        const osc = audioCtx.createOscillator(); const gainNode = audioCtx.createGain();
        osc.connect(gainNode); gainNode.connect(audioCtx.destination);
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.6);
        gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.6);
        osc.start(audioCtx.currentTime); osc.stop(audioCtx.currentTime + 0.6);
    }

    // --- CURSOR EFFECTS ---
    const cursorGlow = document.getElementById('cursor-glow');
    document.addEventListener('mousemove', (e) => { cursorGlow.style.left = `${e.clientX}px`; cursorGlow.style.top = `${e.clientY}px`; });
    document.addEventListener('mousedown', () => cursorGlow.style.transform = 'translate(-50%, -50%) scale(0.8)' );
    document.addEventListener('mouseup', () => cursorGlow.style.transform = 'translate(-50%, -50%) scale(1)' );

    // --- THEME ENGINE ---
    const bgContainer = document.getElementById('dynamic-bg');
    const effectsContainer = document.getElementById('bg-effects');

    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            initAudio();
            const selected = e.target.dataset.theme;
            bgContainer.className = selected; currentTheme = selected;
            generateParticles(selected);
            document.getElementById('theme-selection').style.display = 'none';
            document.getElementById('start-prompt').style.display = 'block';
        });
    });

    function generateParticles(theme) {
        effectsContainer.innerHTML = ''; 
        if (theme === 'theme-space') {
            for(let i=0; i<100; i++) {
                let star = document.createElement('div'); star.className = 'star';
                star.style.width = Math.random() * 5 + 3 + 'px'; star.style.height = star.style.width;
                star.style.left = Math.random() * 100 + 'vw';
                star.style.animationDuration = (Math.random() * 10 + 5) + 's'; star.style.animationDelay = (Math.random() * 5) + 's';
                effectsContainer.appendChild(star);
            }
            const planets = [
                { size: 180, bg: "radial-gradient(circle at 30% 30%, #fffacd, #ff8c00)", top: "5%" },
                { size: 30,  bg: "radial-gradient(circle at 30% 30%, #d3d3d3, #696969)", top: "25%" },
                { size: 50,  bg: "radial-gradient(circle at 30% 30%, #deb887, #8b4513)", top: "50%" },
                { size: 60,  bg: "radial-gradient(circle at 30% 30%, #87ceeb, #0000cd)", top: "70%" },
                { size: 40,  bg: "radial-gradient(circle at 30% 30%, #ff6347, #800000)", top: "40%" },
                { size: 120, bg: "radial-gradient(circle at 30% 30%, #f4a460, #8b4513)", top: "15%" },
                { size: 90,  bg: "radial-gradient(circle at 30% 30%, #eee8aa, #b8860b)", top: "85%" },
                { size: 70,  bg: "radial-gradient(circle at 30% 30%, #e0ffff, #008b8b)", top: "35%" },
                { size: 65,  bg: "radial-gradient(circle at 30% 30%, #4169e1, #000080)", top: "60%" }
            ];
            planets.forEach((p) => {
                let planet = document.createElement('div'); planet.className = 'planet';
                planet.style.width = p.size + 'px'; planet.style.height = p.size + 'px';
                planet.style.background = p.bg; planet.style.top = p.top;
                planet.style.animationDuration = (Math.random() * 80 + 60) + 's';
                planet.style.animationDelay = -(Math.random() * 100) + 's';
                effectsContainer.appendChild(planet);
            });
        } else if (theme === 'theme-snow') {
            for(let i=0; i<50; i++) {
                let snow = document.createElement('div'); snow.className = 'snowflake';
                snow.style.width = Math.random() * 10 + 8 + 'px'; snow.style.height = snow.style.width;
                snow.style.left = Math.random() * 100 + 'vw';
                snow.style.animationDuration = (Math.random() * 5 + 3) + 's'; snow.style.animationDelay = (Math.random() * 5) + 's';
                effectsContainer.appendChild(snow);
            }
        } else if (theme === 'theme-treasure') {
            for(let i=0; i<100; i++) {
                let coin = document.createElement('div'); coin.className = 'coin-particle';
                coin.style.width = Math.random() * 25 + 15 + 'px'; coin.style.height = coin.style.width;
                coin.style.left = Math.random() * 100 + 'vw';
                coin.style.animationDuration = (Math.random() * 5 + 3) + 's'; coin.style.animationDelay = (Math.random() * 5) + 's';
                effectsContainer.appendChild(coin);
            }
        }
    }

    // --- GAME LOGIC & STATE ---
    const valueMap = { 'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13 };
    const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
    
    let deck = [], draggedCards = [], sourcePile = null;
    let score = 0, timeSeconds = 0, timerInterval = null, gameStarted = false;
    let shuffleCount = 0;

    document.getElementById('start-btn').addEventListener('click', () => { document.getElementById('start-overlay').style.display = 'none'; startGame(); });
    document.getElementById('new-game-btn').addEventListener('click', resetToMenu);
    document.getElementById('play-again-btn').addEventListener('click', resetToMenu);

    function resetToMenu() {
        clearInterval(timerInterval);
        document.getElementById('start-overlay').style.display = 'flex';
        document.getElementById('start-prompt').style.display = 'none';
        document.getElementById('theme-selection').style.display = 'block';
        endOverlay.style.display = 'none';
        stopGameMusic();
        gameStarted = false;
    }

    function startGame() {
        gameStarted = true; timeSeconds = 0; score = 0; shuffleCount = 0;
        undoStack = []; 
        undoBtn.innerHTML = `<span class="btn-icon">↩️</span> UNDO`; 
        undoBtn.style.opacity = '0.5'; // Dimmed initially

        currentDeckImage = backgroundImages[Math.floor(Math.random() * backgroundImages.length)];
        initBoard(); 
        updateScore(0, false); updateStatsUI();
        timerEl.innerText = "00:00"; clearInterval(timerInterval);
        playGameMusic(); 
        timerInterval = setInterval(() => {
            timeSeconds++;
            const m = Math.floor(timeSeconds / 60).toString().padStart(2, '0');
            const s = (timeSeconds % 60).toString().padStart(2, '0');
            timerEl.innerText = `${m}:${s}`;
            updateProbability();
        }, 1000);
    }

    function saveState() {
        if (undoStack.length >= 50) undoStack.shift(); // Keep up to 50 undos in memory
        undoStack.push({
            stockHTML: stock.innerHTML,
            wasteHTML: waste.innerHTML,
            foundationsHTML: Array.from(document.querySelectorAll('.foundation')).map(f => f.innerHTML),
            tableausHTML: Array.from(document.querySelectorAll('.tableau')).map(t => t.innerHTML),
            score: score,
            shuffleCount: shuffleCount
        });
        undoBtn.style.opacity = '1';
    }

    undoBtn.addEventListener('click', () => {
        if (undoStack.length === 0 || !gameStarted) return;
        const state = undoStack.pop();
        
        stock.innerHTML = state.stockHTML;
        waste.innerHTML = state.wasteHTML;
        document.querySelectorAll('.foundation').forEach((f, i) => f.innerHTML = state.foundationsHTML[i]);
        document.querySelectorAll('.tableau').forEach((t, i) => t.innerHTML = state.tableausHTML[i]);
        
        score = state.score;
        shuffleCount = state.shuffleCount;
        
        scoreEl.innerText = score;
        updateStatsUI();
        updateProbability();
        updateDraggableState();
        
        if (undoStack.length === 0) undoBtn.style.opacity = '0.5';
    });

    function initBoard() {
        deck = [];
        suits.forEach(suit => Object.keys(valueMap).forEach(value => deck.push({ suit, value, faceUp: false })));
        for (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [deck[i], deck[j]] = [deck[j], deck[i]]; }
        document.querySelectorAll('.pile').forEach(p => p.innerHTML = '');
        let cardIndex = 0;
        for (let i = 0; i < 7; i++) {
            const tableauPile = document.getElementById(`tableau-${i}`);
            for (let j = 0; j <= i; j++) {
                const cardData = deck[cardIndex]; cardData.faceUp = (j === i);
                const cardEl = createCardElement(cardData);
                cardEl.style.top = `${j * 25}px`; cardEl.style.zIndex = j;
                tableauPile.appendChild(cardEl); cardIndex++;
            }
        }
        for (let i = cardIndex; i < deck.length; i++) stock.appendChild(createCardElement(deck[i]));
        updateDraggableState();
    }

    function updateStatsUI() { shufflesEl.innerText = shuffleCount; }
    
    function updateProbability() {
        if (!gameStarted) return; 
        
        let foundations = 0; 
        document.querySelectorAll('.foundation .card').forEach(() => foundations++);

        let hiddenCards = 0;
        document.querySelectorAll('.tableau .card.back').forEach(() => hiddenCards++);

        let revealedProgress = ((21 - hiddenCards) / 21) * 40;
        let foundationProgress = (foundations / 52) * 60;
        
        let prob = revealedProgress + foundationProgress - (shuffleCount * 2) - Math.floor(timeSeconds / 120); 

        prob = Math.max(1, Math.min(99, Math.floor(prob)));
        if (foundations === 52) prob = 100;
        
        probEl.innerText = `${prob}%`;
        probEl.style.color = prob < 30 ? '#e74c3c' : (prob >= 90 ? '#2ecc71' : '#f1c40f');
        
        checkWinFailState(foundations);
    }

    function checkWinFailState(foundationCount) {
        if (foundationCount === 52) { endGame("YOU WON!", "#2ecc71"); }
        else if (stock.children.length === 0 && waste.children.length === 0) {
            if (!findAnyHintMove(false)) { endGame("NO MOVES LEFT", "#e74c3c"); }
        }
    }

    function endGame(title, color) {
        clearInterval(timerInterval); gameStarted = false;
        document.getElementById('end-title').innerText = title;
        document.getElementById('end-title').style.color = color;
        document.getElementById('end-score').innerText = score;
        document.getElementById('end-shuffles').innerText = shuffleCount;
        endOverlay.style.display = 'flex';
        
        stopGameMusic();
        if (title === "YOU WON!") { playVictorySound(); } else { playFailSound(); }
    }

    function updateScore(points, playSoundEffect = true) {
        score += points; if(score < 0) score = 0;
        scoreEl.innerText = score;
        if(points > 0) {
            const rect = document.getElementById('score').getBoundingClientRect();
            const floater = document.createElement('div'); floater.className = 'floating-score'; floater.innerText = `+${points}`;
            floater.style.left = `${rect.left}px`; floater.style.top = `${rect.top - 20}px`;
            document.body.appendChild(floater); setTimeout(() => floater.remove(), 1000);
            if(playSoundEffect) playCoinSound();
        }
        updateProbability();
    }

    // --- SMART HINT ENGINE ---
    hintBtn.addEventListener('click', () => {
        const hasMoves = findAnyHintMove(true);
        if (!hasMoves) { endGame("NO MOVES LEFT", "#e74c3c"); }
    });

    function findAnyHintMove(showVisuals) {
        document.querySelectorAll('.hint-glow').forEach(el => el.classList.remove('hint-glow'));
        let potentialMoves = [];

        // 1. Scan Tableau
        document.querySelectorAll('.tableau').forEach(sourcePile => {
            const faceUpCards = Array.from(sourcePile.querySelectorAll('.card:not(.back)'));
            if (faceUpCards.length > 0) {
                
                // Top Card to Foundation (Priority 1)
                const topFaceUp = faceUpCards[faceUpCards.length - 1];
                document.querySelectorAll('.foundation').forEach(targetPile => {
                    if (canMoveToFoundation(topFaceUp, targetPile)) {
                        potentialMoves.push({ source: topFaceUp, target: targetPile, priority: 1 });
                    }
                });

                // Deepest Face-Up Card to another Tableau (Priority 2 or 5)
                const bottomFaceUp = faceUpCards[0];
                document.querySelectorAll('.tableau').forEach(targetPile => {
                    if (sourcePile !== targetPile && canMoveToTableau(bottomFaceUp, targetPile)) {
                        const revealsHiddenCard = sourcePile.children.length > faceUpCards.length;
                        const isKingToEmpty = valueMap[bottomFaceUp.dataset.value] === 13 && targetPile.children.length === 0;

                        if (revealsHiddenCard || (isKingToEmpty && revealsHiddenCard)) {
                            potentialMoves.push({ source: bottomFaceUp, target: targetPile, priority: 2 }); // Helpful move
                        } else if (!isKingToEmpty) {
                            potentialMoves.push({ source: bottomFaceUp, target: targetPile, priority: 5 }); // Meaningless lateral move
                        }
                    }
                });
            }
        });

        // 2. Scan Waste (Priority 3 & 4)
        const wCard = waste.lastElementChild;
        if (wCard) {
            document.querySelectorAll('.foundation').forEach(target => {
                if (canMoveToFoundation(wCard, target)) potentialMoves.push({ source: wCard, target: target, priority: 3 });
            });
            document.querySelectorAll('.tableau').forEach(target => {
                if (canMoveToTableau(wCard, target)) potentialMoves.push({ source: wCard, target: target, priority: 4 });
            });
        }

        // Evaluate Best Move
        if (potentialMoves.length > 0) {
            potentialMoves.sort((a, b) => a.priority - b.priority);
            let bestMove = potentialMoves[0];
            
            // If the only moves left are "meaningless" (Priority 5), we should suggest drawing a card instead IF possible
            if (bestMove.priority === 5 && (stock.children.length > 0 || waste.children.length > 0)) {
                // Fallthrough to stock draw below
            } else {
                if(showVisuals) { bestMove.source.classList.add('hint-glow'); bestMove.target.classList.add('hint-glow'); }
                if(showVisuals) setTimeout(() => document.querySelectorAll('.hint-glow').forEach(el => el.classList.remove('hint-glow')), 2000);
                return true;
            }
        }

        // 3. Fallback: Suggest Drawing/Recycling
        if (stock.children.length > 0 || waste.children.length > 0) {
            if(showVisuals) {
                if (stock.children.length > 0) document.getElementById('stock').classList.add('hint-glow');
                else document.getElementById('waste').classList.add('hint-glow'); 
            }
            if(showVisuals) setTimeout(() => document.querySelectorAll('.hint-glow').forEach(el => el.classList.remove('hint-glow')), 2000);
            return true;
        }

        return false;
    }

    // --- CARD RENDERING ---
    function renderCardInner(c, val, suit) {
        const sym = { 'hearts':'♥', 'diamonds':'♦', 'clubs':'♣', 'spades':'♠' }[suit];
        let centerGraphic = `<div class="card-suit-large">${sym}</div>`;
        if(val === 'J') centerGraphic = `<div class="face-img">💂</div>`;
        if(val === 'Q') centerGraphic = `<div class="face-img">👸</div>`;
        if(val === 'K') centerGraphic = `<div class="face-img">🤴</div>`;
        c.innerHTML = `<div class="card-top"><span>${val}</span><span style="font-size: 14px;">${sym}</span></div>${centerGraphic}<div class="card-bottom"><span>${val}</span><span style="font-size: 14px;">${sym}</span></div>`;
    }

    function createCardElement(cardData) {
        const card = document.createElement('div'); card.classList.add('card');
        card.dataset.suit = cardData.suit; card.dataset.value = cardData.value;
        card.dataset.color = (cardData.suit === 'hearts' || cardData.suit === 'diamonds') ? 'red' : 'black';
        
        if (!cardData.faceUp) { 
            card.classList.add('back');
            card.style.backgroundImage = `url('${currentDeckImage}')`;
            card.setAttribute('draggable', 'false'); 
        } else {
            card.classList.add(card.dataset.color); card.style.background = 'white';
            renderCardInner(card, cardData.value, cardData.suit); card.setAttribute('draggable', 'true');
        }
        return card;
    }

    function updateDraggableState() {
        Array.from(stock.children).forEach(c => c.setAttribute('draggable', 'false'));
        Array.from(waste.children).forEach((c, i, arr) => c.setAttribute('draggable', (i === arr.length - 1) ? 'true' : 'false'));
        document.querySelectorAll('.foundation').forEach(f => Array.from(f.children).forEach((c, i, arr) => c.setAttribute('draggable', (i === arr.length - 1) ? 'true' : 'false')));
        document.querySelectorAll('.tableau').forEach(t => Array.from(t.children).forEach(c => { if(!c.classList.contains('back')) c.setAttribute('draggable', 'true'); }));
    }

    function canMoveToTableau(drag, target) {
        const top = target.lastElementChild;
        if (!top) return valueMap[drag.dataset.value] === 13;
        if (top.classList.contains('back')) return false;
        return drag.dataset.color !== top.dataset.color && valueMap[drag.dataset.value] === valueMap[top.dataset.value] - 1;
    }
    function canMoveToFoundation(drag, target) {
        if (draggedCards.length > 1) return false;
        const top = target.lastElementChild;
        if (!top) return valueMap[drag.dataset.value] === 1 && drag.dataset.suit === target.dataset.suit;
        return drag.dataset.suit === target.dataset.suit && valueMap[drag.dataset.value] === valueMap[top.dataset.value] + 1;
    }

    // --- DRAG EVENTS ---
    const board = document.querySelector('.board');
    board.addEventListener('dragstart', (e) => {
        if (e.target.classList.contains('back') || e.target.getAttribute('draggable') === 'false') { e.preventDefault(); return; }
        sourcePile = e.target.parentElement;
        if (sourcePile.classList.contains('tableau')) {
            const children = Array.from(sourcePile.children);
            draggedCards = children.slice(children.indexOf(e.target));
        } else draggedCards = [e.target];
        setTimeout(() => draggedCards.forEach(c => c.classList.add('dragging')), 0);
    });

    board.addEventListener('dragend', () => {
        draggedCards.forEach(c => c.classList.remove('dragging'));
        document.querySelectorAll('.pile').forEach(p => p.classList.remove('drag-over', 'drag-error'));
        draggedCards = []; sourcePile = null;
    });

    document.querySelectorAll('.pile').forEach(pile => {
        pile.addEventListener('dragover', (e) => {
            e.preventDefault();
            if (draggedCards.length === 0 || pile === sourcePile || pile.classList.contains('stock-pile')) return;
            let isValid = pile.classList.contains('tableau') ? canMoveToTableau(draggedCards[0], pile) : canMoveToFoundation(draggedCards[0], pile);
            if(isValid) pile.classList.add('drag-over'); else pile.classList.add('drag-error');
        });
        pile.addEventListener('dragleave', () => pile.classList.remove('drag-over', 'drag-error'));
        
        pile.addEventListener('drop', (e) => {
            e.preventDefault(); pile.classList.remove('drag-over', 'drag-error');
            if (draggedCards.length === 0 || pile === sourcePile || pile.classList.contains('stock-pile')) return;

            let isValidDrop = false;
            if (pile.classList.contains('tableau') && canMoveToTableau(draggedCards[0], pile)) {
                isValidDrop = true;
            } else if (pile.classList.contains('foundation') && canMoveToFoundation(draggedCards[0], pile)) {
                isValidDrop = true;
            }

            if (isValidDrop) {
                saveState(); // Commit to history before moving

                if (pile.classList.contains('tableau')) {
                    const existingCount = pile.children.length;
                    draggedCards.forEach((card, idx) => { card.style.top = `${(existingCount + idx) * 25}px`; card.style.zIndex = existingCount + idx; pile.appendChild(card); });
                } else if (pile.classList.contains('foundation')) {
                    draggedCards[0].style.top = '0px'; draggedCards[0].style.zIndex = pile.children.length; pile.appendChild(draggedCards[0]);
                    updateScore(10, false); 
                }

                playCoinSound(); 

                if (sourcePile.classList.contains('tableau') && sourcePile.children.length > 0) {
                    const topSource = sourcePile.lastElementChild;
                    if (topSource.classList.contains('back')) {
                        topSource.classList.remove('back'); topSource.classList.add(topSource.dataset.color);
                        topSource.style.backgroundImage = 'none'; topSource.style.background = 'white';
                        renderCardInner(topSource, topSource.dataset.value, topSource.dataset.suit);
                        topSource.style.animationDelay = `${Math.random()}s`; updateScore(5, false);
                    }
                }
                updateDraggableState(); updateProbability();
            } else {
                playErrorSound();
            }
        });
    });

    stock.addEventListener('click', () => {
        if (!gameStarted) return;
        playDrawSound();

        if (stock.children.length === 0) {
            if (waste.children.length === 0) return;
            saveState(); 
            while (waste.children.length > 0) {
                const c = waste.lastElementChild;
                c.classList.add('back'); c.classList.remove('red', 'black');
                c.style.backgroundImage = `url('${currentDeckImage}')`;
                c.innerHTML = ''; c.setAttribute('draggable', 'false'); stock.appendChild(c);
            }
            shuffleCount++; updateStatsUI(); updateProbability();
        } else {
            saveState(); 
            const c = stock.lastElementChild;
            c.classList.remove('back'); c.classList.add(c.dataset.color);
            c.style.backgroundImage = 'none'; c.style.background = 'white';
            renderCardInner(c, c.dataset.value, c.dataset.suit);
            c.style.animationDelay = `${Math.random()}s`; waste.appendChild(c);
        }
        updateDraggableState();
    });
});