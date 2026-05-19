(function() {
  'use strict';

  var CONFIG = {
    storageKey: 'mdg_snake',
    gridSize: 20,
    canvasW: 560,
    canvasH: 520,
    baseSpeed: 150,
    speedIncrease: 2,
    minSpeed: 60,
  };

  var CELL_W = CONFIG.canvasW / CONFIG.gridSize;
  var CELL_H = CONFIG.canvasH / CONFIG.gridSize;
  var COLS = CONFIG.gridSize;
  var ROWS = CONFIG.gridSize;

  var state = {
    currentScreen: 'home',
    screenHistory: [],
    data: { highScore: 0 },
    snake: [],
    direction: { x: 1, y: 0 },
    nextDirection: { x: 1, y: 0 },
    food: { x: 0, y: 0 },
    score: 0,
    gameLoop: null,
    paused: false,
    alive: false,
  };

  var screens = {};
  var canvas, ctx;

  function collectScreens() {
    document.querySelectorAll('.screen').forEach(function(s) {
      if (s.id) screens[s.id] = s;
    });
  }

  function navigateTo(screenId, options) {
    options = options || {};
    var addToHistory = options.addToHistory !== false;
    if (addToHistory && state.currentScreen) {
      state.screenHistory.push(state.currentScreen);
    }
    Object.values(screens).forEach(function(s) { s.classList.add('hidden'); });
    if (screens[screenId]) {
      screens[screenId].classList.remove('hidden');
      state.currentScreen = screenId;
      onScreenEnter(screenId);
      focusFirst(screens[screenId]);
    }
  }

  function navigateBack() {
    if (state.screenHistory.length > 0) {
      navigateTo(state.screenHistory.pop(), { addToHistory: false });
    }
  }

  function focusFirst(container) {
    var el = container.querySelector('.focusable:not([disabled]):not(.hidden)');
    if (el) el.focus();
  }

  function moveFocus(direction) {
    var container = screens[state.currentScreen];
    if (!container) return;
    var focusables = Array.from(
      container.querySelectorAll('.focusable:not([disabled]):not(.hidden)')
    );
    if (focusables.length === 0) return;
    var current = document.activeElement;
    var idx = focusables.indexOf(current);
    if (idx === -1) { focusFirst(container); return; }
    var nextIdx;
    if (direction === 'up' || direction === 'left') {
      nextIdx = idx > 0 ? idx - 1 : focusables.length - 1;
    } else {
      nextIdx = idx < focusables.length - 1 ? idx + 1 : 0;
    }
    focusables[nextIdx].focus();
  }

  function loadData() {
    try {
      var saved = localStorage.getItem(CONFIG.storageKey);
      if (saved) Object.assign(state.data, JSON.parse(saved));
    } catch (e) {}
  }

  function saveData() {
    try {
      localStorage.setItem(CONFIG.storageKey, JSON.stringify(state.data));
    } catch (e) {}
  }

  function resetGame() {
    var startX = Math.floor(COLS / 2);
    var startY = Math.floor(ROWS / 2);
    state.snake = [
      { x: startX, y: startY },
      { x: startX - 1, y: startY },
      { x: startX - 2, y: startY },
    ];
    state.direction = { x: 1, y: 0 };
    state.nextDirection = { x: 1, y: 0 };
    state.score = 0;
    state.paused = false;
    state.alive = true;
    placeFood();
    updateHUD();
  }

  function placeFood() {
    var occupied = {};
    state.snake.forEach(function(s) { occupied[s.x + ',' + s.y] = true; });
    var free = [];
    for (var x = 0; x < COLS; x++) {
      for (var y = 0; y < ROWS; y++) {
        if (!occupied[x + ',' + y]) free.push({ x: x, y: y });
      }
    }
    if (free.length === 0) {
      gameOver();
      return;
    }
    state.food = free[Math.floor(Math.random() * free.length)];
  }

  function getSpeed() {
    return Math.max(CONFIG.minSpeed, CONFIG.baseSpeed - state.score * CONFIG.speedIncrease);
  }

  function startLoop() {
    stopLoop();
    function tick() {
      if (!state.alive) return;
      if (!state.paused) {
        update();
        draw();
      }
      state.gameLoop = setTimeout(tick, getSpeed());
    }
    state.gameLoop = setTimeout(tick, getSpeed());
  }

  function stopLoop() {
    if (state.gameLoop) {
      clearTimeout(state.gameLoop);
      state.gameLoop = null;
    }
  }

  function update() {
    state.direction = state.nextDirection;
    var head = state.snake[0];
    var newHead = { x: head.x + state.direction.x, y: head.y + state.direction.y };

    if (newHead.x < 0 || newHead.x >= COLS || newHead.y < 0 || newHead.y >= ROWS) {
      gameOver();
      return;
    }

    for (var i = 0; i < state.snake.length; i++) {
      if (state.snake[i].x === newHead.x && state.snake[i].y === newHead.y) {
        gameOver();
        return;
      }
    }

    state.snake.unshift(newHead);

    if (newHead.x === state.food.x && newHead.y === state.food.y) {
      state.score++;
      updateHUD();
      placeFood();
    } else {
      state.snake.pop();
    }
  }

  function draw() {
    ctx.clearRect(0, 0, CONFIG.canvasW, CONFIG.canvasH);

    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, CONFIG.canvasW, CONFIG.canvasH);

    ctx.strokeStyle = '#1a1a2e';
    ctx.lineWidth = 0.5;
    for (var x = 0; x <= COLS; x++) {
      ctx.beginPath();
      ctx.moveTo(x * CELL_W, 0);
      ctx.lineTo(x * CELL_W, CONFIG.canvasH);
      ctx.stroke();
    }
    for (var y = 0; y <= ROWS; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * CELL_H);
      ctx.lineTo(CONFIG.canvasW, y * CELL_H);
      ctx.stroke();
    }

    for (var i = state.snake.length - 1; i >= 0; i--) {
      var seg = state.snake[i];
      var t = i / state.snake.length;
      if (i === 0) {
        ctx.fillStyle = '#00ff88';
      } else {
        var g = Math.round(255 * (1 - t * 0.6));
        var b = Math.round(136 * (1 - t * 0.4));
        ctx.fillStyle = 'rgb(0,' + g + ',' + b + ')';
      }
      var pad = 1;
      ctx.beginPath();
      roundRect(ctx, seg.x * CELL_W + pad, seg.y * CELL_H + pad, CELL_W - pad * 2, CELL_H - pad * 2, 4);
      ctx.fill();
    }

    if (state.snake.length > 0) {
      var h = state.snake[0];
      var eyeSize = 3;
      ctx.fillStyle = '#0a0a0f';
      if (state.direction.x === 1) {
        ctx.fillRect(h.x * CELL_W + CELL_W - 10, h.y * CELL_H + 6, eyeSize, eyeSize);
        ctx.fillRect(h.x * CELL_W + CELL_W - 10, h.y * CELL_H + CELL_H - 9, eyeSize, eyeSize);
      } else if (state.direction.x === -1) {
        ctx.fillRect(h.x * CELL_W + 7, h.y * CELL_H + 6, eyeSize, eyeSize);
        ctx.fillRect(h.x * CELL_W + 7, h.y * CELL_H + CELL_H - 9, eyeSize, eyeSize);
      } else if (state.direction.y === -1) {
        ctx.fillRect(h.x * CELL_W + 6, h.y * CELL_H + 7, eyeSize, eyeSize);
        ctx.fillRect(h.x * CELL_W + CELL_W - 9, h.y * CELL_H + 7, eyeSize, eyeSize);
      } else {
        ctx.fillRect(h.x * CELL_W + 6, h.y * CELL_H + CELL_H - 10, eyeSize, eyeSize);
        ctx.fillRect(h.x * CELL_W + CELL_W - 9, h.y * CELL_H + CELL_H - 10, eyeSize, eyeSize);
      }
    }

    var fx = state.food.x * CELL_W + CELL_W / 2;
    var fy = state.food.y * CELL_H + CELL_H / 2;
    var pulse = 0.8 + 0.2 * Math.sin(Date.now() / 200);
    var fr = (Math.min(CELL_W, CELL_H) / 2 - 2) * pulse;
    ctx.fillStyle = '#ff4466';
    ctx.beginPath();
    ctx.arc(fx, fy, fr, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 68, 102, 0.3)';
    ctx.beginPath();
    ctx.arc(fx, fy, fr + 4, 0, Math.PI * 2);
    ctx.fill();
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
  }

  function updateHUD() {
    var scoreEl = document.getElementById('score-display');
    var bestEl = document.getElementById('best-display');
    if (scoreEl) scoreEl.textContent = state.score;
    if (bestEl) bestEl.textContent = state.data.highScore;
  }

  function gameOver() {
    state.alive = false;
    stopLoop();

    var isNewHigh = state.score > state.data.highScore;
    if (isNewHigh) {
      state.data.highScore = state.score;
      saveData();
    }

    setTimeout(function() {
      document.getElementById('final-score').textContent = state.score;
      document.getElementById('final-best').textContent = state.data.highScore;
      var badge = document.getElementById('new-high-badge');
      if (isNewHigh && state.score > 0) {
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }
      navigateTo('gameover');
    }, 400);
  }

  function togglePause() {
    if (!state.alive) return;
    state.paused = !state.paused;
    var overlay = document.getElementById('pause-overlay');
    if (overlay) overlay.classList.toggle('hidden', !state.paused);
  }

  function handleAction(action) {
    switch (action) {
      case 'back':
        if (state.currentScreen === 'game') {
          stopLoop();
          state.alive = false;
        }
        navigateBack();
        break;
      case 'start-game':
        state.screenHistory = [];
        navigateTo('game', { addToHistory: false });
        break;
      case 'show-controls':
        navigateTo('controls');
        break;
      case 'go-home':
        state.screenHistory = [];
        navigateTo('home', { addToHistory: false });
        break;
    }
  }

  function onScreenEnter(screenId) {
    if (screenId === 'home') {
      document.getElementById('home-high-score').textContent = state.data.highScore;
    } else if (screenId === 'game') {
      canvas = document.getElementById('game-canvas');
      ctx = canvas.getContext('2d');
      resetGame();
      draw();
      startLoop();
    }
  }

  function setupEvents() {
    document.addEventListener('click', function(e) {
      var actionEl = e.target.closest('[data-action]');
      if (actionEl) handleAction(actionEl.dataset.action);
    });

    document.addEventListener('keydown', function(e) {
      if (state.currentScreen === 'game' && state.alive) {
        switch (e.key) {
          case 'ArrowUp':
            if (state.direction.y !== 1) state.nextDirection = { x: 0, y: -1 };
            e.preventDefault();
            return;
          case 'ArrowDown':
            if (state.direction.y !== -1) state.nextDirection = { x: 0, y: 1 };
            e.preventDefault();
            return;
          case 'ArrowLeft':
            if (state.direction.x !== 1) state.nextDirection = { x: -1, y: 0 };
            e.preventDefault();
            return;
          case 'ArrowRight':
            if (state.direction.x !== -1) state.nextDirection = { x: 1, y: 0 };
            e.preventDefault();
            return;
          case 'Enter':
            togglePause();
            e.preventDefault();
            return;
          case 'Escape':
            handleAction('back');
            e.preventDefault();
            return;
        }
      }

      switch (e.key) {
        case 'ArrowUp':
          moveFocus('up');
          e.preventDefault();
          break;
        case 'ArrowDown':
          moveFocus('down');
          e.preventDefault();
          break;
        case 'ArrowLeft':
          moveFocus('left');
          e.preventDefault();
          break;
        case 'ArrowRight':
          moveFocus('right');
          e.preventDefault();
          break;
        case 'Enter':
          if (document.activeElement && document.activeElement.classList.contains('focusable')) {
            document.activeElement.click();
          }
          e.preventDefault();
          break;
        case 'Escape':
          navigateBack();
          e.preventDefault();
          break;
      }
    });
  }

  function init() {
    collectScreens();
    setupEvents();
    loadData();
    setTimeout(function() {
      navigateTo('home', { addToHistory: false });
    }, 100);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
