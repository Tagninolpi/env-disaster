import { refresh_view, getTileFromClick, initDrawAssets, resizeCanvas } from './draw.js';
import * as bottomPanel from './bottom_panel.js';

const app = document.getElementById("app");

// -------------------- GAME STATE --------------------
const gameState = {
  hexes: [],
  energy: 0,
  environment: 0,
  tile_price: 0,
  nb_bought_tiles: 0,
  building_pref: {},
  buildings: {},
};

// -------------------- GAME END RULES --------------------
const WIN_ENERGY = 1_000_000;
const WIN_ENV = -100;
const LOSE_ENERGY = 0;
const LOSE_ENV = 100;

let gameActive = false;
let selectedTileId = null;
let selectedBuilding = null;
let gameTickInterval = null;
const playerId = crypto.randomUUID();

// -------------------- APPLY SERVER STATE --------------------
function applyServerState(data) {
  if (!data) return;

  if (data.tiles) gameState.hexes = data.tiles;
  if (data.energy !== undefined) gameState.energy = data.energy;
  if (data.env_bar !== undefined) gameState.environment = data.env_bar;
  if (data.tile_price !== undefined) gameState.tile_price = data.tile_price;
  if (data.nb_bought_tiles !== undefined) gameState.nb_bought_tiles = data.nb_bought_tiles;
  if (data.building_pref) gameState.building_pref = data.building_pref;
  if (data.buildings) gameState.buildings = data.buildings;

  selectedBuilding = null;
  bottomPanel.setBottomPanelState(gameState);
  refresh_view(gameState.hexes, selectedTileId);

  document.getElementById("energy-value").textContent = gameState.energy;
  document.getElementById("environment-value").textContent =
    Math.round(gameState.environment * 10000) / 10000;
}

// -------------------- SERVER CALL --------------------
async function callApi(url, payload = {}, isTick = false) {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ player_id: playerId, ...payload })
    });

    if (!res.ok) return null;

    const data = await res.json();

    if (isTick && gameActive) {
      if (data.energy !== undefined) gameState.energy = data.energy;
      if (data.env_bar !== undefined) gameState.environment = data.env_bar;

      document.getElementById("energy-value").textContent = gameState.energy;
      document.getElementById("environment-value").textContent =
        Math.round(gameState.environment * 10000) / 10000;

      if (checkGameEnd()) return null;
    }

    return data;
  } catch {
    return null;
  }
}

// -------------------- GAME TICK --------------------
function startGameTick() {
  if (gameTickInterval) return;
  gameTickInterval = setInterval(() => {
    if (!gameActive) return;
    callApi("/api/game_tick", {}, true);
  }, 1000);
}

function stopGameTick() {
  if (gameTickInterval) {
    clearInterval(gameTickInterval);
    gameTickInterval = null;
  }
}

// -------------------- CANVAS EVENTS --------------------
function bindCanvasEvents() {
  const canvas = document.getElementById("game-canvas");
  if (!canvas) return;

  canvas.addEventListener("click", e => {
    const tile = getTileFromClick(e, gameState.hexes);

    bottomPanel.setBottomPanelState(gameState);

    if (!tile || tile.id === selectedTileId) {
      selectedTileId = null;
      bottomPanel.updateBottomPanel(null);
    } else {
      selectedTileId = tile.id;
      bottomPanel.updateBottomPanel(tile);
    }

    refresh_view(gameState.hexes, selectedTileId);
  });
}

// -------------------- USER ACTIONS --------------------
window.buyTile = async () => {
  if (selectedTileId == null) return;

  const tileId = selectedTileId;
  selectedTileId = null;
  selectedBuilding = null;

  bottomPanel.updateBottomPanel(null, gameState);
  refresh_view(gameState.hexes, null);

  const data = await callApi("/api/buy_tile", { tile_id: tileId });
  if (data) applyServerState(data);
};

window.buyBuilding = async () => {
  if (selectedTileId === null || !selectedBuilding) return;

  const tileId = selectedTileId;
  const building = selectedBuilding;

  selectedTileId = null;
  selectedBuilding = null;

  bottomPanel.updateBottomPanel(null);
  refresh_view(gameState.hexes, null);

  const data = await callApi("/api/buy_building", { tile_id: tileId, building });
  if (data) applyServerState(data);
};

window.upgradeBuilding = async () => {
  if (selectedTileId === null) return;

  const tileId = selectedTileId;
  selectedTileId = null;

  bottomPanel.updateBottomPanel(null);
  refresh_view(gameState.hexes, null);

  const data = await callApi("/api/upgrade_building", { tile_id: tileId });
  if (data) applyServerState(data);
};

// -------------------- GAME END --------------------
async function endGame({ win, reason }) {
  stopGameTick();
  gameActive = false;

  await loadPage("game_end");

  document.getElementById("end-result").textContent = win ? "YOU WON" : "YOU LOST";
  document.getElementById("end-result").className = win ? "win" : "lose";
  document.getElementById("end-reason").textContent = reason;

  document.getElementById("end-energy").textContent = gameState.energy;
  document.getElementById("end-environment").textContent =
    Math.round(gameState.environment * 10000) / 10000;

  document
    .getElementById("return-menu-btn")
    .addEventListener("click", () => loadPage("main_menu"));
}

function checkGameEnd() {
  if (gameState.energy >= WIN_ENERGY) return endGame({ win: true, reason: "You reached 1,000,000 energy production." }), true;
  if (gameState.environment <= WIN_ENV) return endGame({ win: true, reason: "You fully exploited the environment." }), true;
  if (gameState.energy <= LOSE_ENERGY) return endGame({ win: false, reason: "You ran out of energy." }), true;
  if (gameState.environment >= LOSE_ENV) return endGame({ win: false, reason: "The environment collapsed." }), true;
  return false;
}

// -------------------- PAGE FLOW --------------------
async function loadPage(name) {
  const res = await fetch(`/static/fragments/${name}.html`);
  app.innerHTML = res.ok ? await res.text() : "<p>Page not found</p>";

  if (name === "main_menu") {
    document.getElementById("start-game-btn")?.addEventListener("click", startGame);
  }
}

async function startGame() {
  gameActive = true;
  await initDrawAssets();

  const data = await callApi("/api/start");
  if (!data) return;

  await loadPage("game_view");

  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);

  bindCanvasEvents();
  applyServerState(data);
  bottomPanel.updateBottomPanel(null, gameState);
  startGameTick();
}

// -------------------- BUILDING SELECTION --------------------
window.showBuildingDetails = name => {
  selectedBuilding = name;
  bottomPanel.showBuildingDetails(name);
};

// -------------------- HANDLE PAGE RELOAD / EXIT --------------------
window.addEventListener("beforeunload", () => {
  stopGameTick();
  gameActive = false;
  navigator.sendBeacon("/api/disconnect", JSON.stringify({ player_id: playerId }));
});

// -------------------- INIT --------------------
loadPage("main_menu");
