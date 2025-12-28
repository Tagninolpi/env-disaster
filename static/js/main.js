import { refresh_view, getTileFromClick, initDrawAssets, resizeCanvas} from './draw.js';
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

    if (isTick) {
      if (data.energy !== undefined) gameState.energy = data.energy;
      if (data.env_bar !== undefined) gameState.environment = data.env_bar;
      document.getElementById("energy-value").textContent = gameState.energy;
      document.getElementById("environment-value").textContent =
          Math.round(gameState.environment * 10000) / 10000;
    }

    return data;
  } catch {
    return null;
  }
}

// -------------------- GAME TICK --------------------
function startGameTick() {
  if (!gameTickInterval) {
    gameTickInterval = setInterval(
      () => callApi("/api/game_tick", {}, true),
      1000
    );
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

  const data = await callApi("/api/buy_building", {
    tile_id: tileId,
    building
  });

  if (data) {
    applyServerState(data);

    bottomPanel.updateBottomPanel(null);
    refresh_view(gameState.hexes, null);
  }
};

window.upgradeBuilding = async () => {
  if (selectedTileId === null) return;

  const tileId = selectedTileId;
  selectedTileId = null;

  bottomPanel.updateBottomPanel(null);
  refresh_view(gameState.hexes, null);

  const data = await callApi("/api/upgrade_building", { tile_id: tileId });

  if (data) {
    applyServerState(data);
    bottomPanel.updateBottomPanel(null);
    refresh_view(gameState.hexes, null);
  }
};

// -------------------- PAGE FLOW --------------------
async function loadPage(name) {
  const res = await fetch(`/static/fragments/${name}.html`);
  app.innerHTML = res.ok ? await res.text() : "<p>Page not found</p>";
  if (name === "main_menu") {
    document.getElementById("start-game-btn")?.addEventListener("click", startGame);
  }
}

async function startGame() {
  await initDrawAssets();

  const data = await callApi("/api/start");
  if (!data) return;

  await loadPage("game_view");

  // --- RESIZE CANVAS ---
  resizeCanvas(); // set correct square size before drawing
  window.addEventListener("resize", () => {
    resizeCanvas();
  });

  bindCanvasEvents();
  applyServerState(data);
  bottomPanel.updateBottomPanel(null, gameState);
  startGameTick();
}

// -------------------- BUILDING SELECTION BRIDGE --------------------
window.showBuildingDetails = name => {
  selectedBuilding = name;
  bottomPanel.showBuildingDetails(name);
};

// -------------------- INIT --------------------
loadPage("main_menu");
