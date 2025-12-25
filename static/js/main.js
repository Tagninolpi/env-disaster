import { refresh_view, getTileFromClick } from './draw.js';
import * as bottomPanel from './bottom_panel.js';

const app = document.getElementById("app");
export let hexes = [];
let selectedTileId = null;

function bindCanvasEvents() {
  const canvas = document.getElementById("game-canvas");
  if (!canvas) return;

  canvas.addEventListener("click", e => {
    const tile = getTileFromClick(e);

    if (!tile || tile.id === selectedTileId) {
      selectedTileId = null;
      bottomPanel.updateBottomPanel(null);
    } else {
      selectedTileId = tile.id;
      bottomPanel.updateBottomPanel(tile);
    }

    refresh_view(hexes, selectedTileId);
  });
}

async function loadPage(name) {
  const res = await fetch(`/static/fragments/${name}.html`);
  app.innerHTML = await res.text();
  bindPageEvents(name);
}

function bindPageEvents(page) {
  if (page === "main_menu") {
    document.getElementById("start-game-btn").onclick = () => {
      loadPage("game_view").then(() => {
        refresh_view(hexes, selectedTileId);
        bindCanvasEvents();
      });
    };
  }
}

// Expose bottom panel functions globally for inline buttons
window.buyTile = bottomPanel.buyTile;
window.upgradeBuilding = bottomPanel.upgradeBuilding;
window.selectCategory = bottomPanel.selectCategory;
window.selectTower = bottomPanel.selectTower;
window.backToCategories = bottomPanel.backToCategories;

window.showBuildingDetails = bottomPanel.showBuildingDetails;
window.backToBuildings = bottomPanel.backToBuildings;
window.buyBuilding = bottomPanel.buyBuilding;

loadPage("main_menu");
