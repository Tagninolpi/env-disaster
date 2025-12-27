let selectedCategory = null;
let currentState = null;

/* ---------- STATE SYNC ---------- */
export function setBottomPanelState(state) {
  currentState = state;
}

/* ---------- MODULE VISIBILITY ---------- */
export function showModule(id) {
  document
    .querySelectorAll("#bottom-panel .module")
    .forEach(m => m.classList.add("hidden"));

  document.getElementById(id)?.classList.remove("hidden");
}

/* ---------- RESET HELPERS ---------- */
function hideAllBuildingSubcontainers() {
  document
    .querySelectorAll(".building-category")
    .forEach(d => d.classList.add("hidden"));
}

function resetEmptyTileUI() {
  selectedCategory = null;
  document.getElementById("category-buttons")?.classList.remove("hidden");
  document.getElementById("building-details")?.classList.add("hidden");
  hideAllBuildingSubcontainers();
}

/* ---------- MAIN ENTRY ---------- */
export function updateBottomPanel(tile) {
  if (!currentState || !tile) {
    showModule("module-default");
    return;
  }

  const status = tile.status;

  if (status === "locked") {
    showModule("module-not-buyable");
    return;
  }

  if (status === "buyable") {
    const price = currentState.tile_price * currentState.nb_bought_tiles;
    const buyBtn = document.querySelector("#module-buyable button");

    document.getElementById("buyable-price").textContent = price;

    if (currentState.energy < price) {
      buyBtn.disabled = true;
      buyBtn.textContent = "Not enough energy";
    } else {
      buyBtn.disabled = false;
      buyBtn.textContent = "Buy Tile";
    }

    showModule("module-buyable");
    return;
  }

  if (status === "empty") {
    showModule("module-empty");
    resetEmptyTileUI();
    return;
  }

  if (typeof status === "object") { // building
    showModule("module-occupied");
    updateBuildingInfo(status);
    updateUpgradeButton(status);
  }
}

/* ---------- CATEGORY SELECTION ---------- */
export function selectCategory(category) {
  selectedCategory = category;

  document.getElementById("category-buttons")?.classList.add("hidden");
  hideAllBuildingSubcontainers();
  document.getElementById(`buildings-${category}`)?.classList.remove("hidden");
}

/* ---------- BACK TO CATEGORIES ---------- */
export function backToCategories() {
  selectedCategory = null;
  document.getElementById("category-buttons")?.classList.remove("hidden");
  hideAllBuildingSubcontainers();
  document.getElementById("building-details")?.classList.add("hidden");
}

/* ---------- BUILDING DETAILS ---------- */
export function showBuildingDetails(name) {
  if (!currentState) return;

  showModule("building-details");

  const stats = currentState.buildings[name];
  const info = currentState.building_stats[name];
  const price = stats ? stats.base_cost + Math.sqrt(stats.nb || 0) : Infinity;
  const buyBtn = document.querySelector("#building-details button:first-of-type");

  document.getElementById("detail-building-name").textContent = name;
  document.getElementById("detail-price").textContent = price;
  document.getElementById("detail-production").textContent = info ? info.E_prod : "?";

  const preferred = [];
  for (const [tile, arr] of Object.entries(currentState.building_pref)) {
    if (arr.includes(name)) preferred.push(tile);
  }
  document.getElementById("detail-preferred-tile").textContent = preferred.join(", ") || "-";

  // ROUND env values to 3 decimals
  document.getElementById("detail-env-build").textContent =
    stats ? (Math.round(stats.env_cost * 1000) / 1000) : "?";
  document.getElementById("detail-env-usage").textContent =
    info ? (Math.round(info.env_cost * 1000) / 1000) : "?";

  if (currentState.energy < price) {
    buyBtn.disabled = true;
    buyBtn.textContent = "Not enough energy";
  } else {
    buyBtn.disabled = false;
    buyBtn.textContent = "Buy";
  }
}

/* ---------- BACK TO BUILDINGS ---------- */
export function backToBuildings() {
  if (!selectedCategory) {
    backToCategories();
    return;
  }

  document.getElementById("building-details")?.classList.add("hidden");
  hideAllBuildingSubcontainers();
  document.getElementById(`buildings-${selectedCategory}`)?.classList.remove("hidden");
  showModule("module-empty");
}

/* ---------- OCCUPIED TILE INFO ---------- */
function updateBuildingInfo(b) {
  if (!currentState || !b) return;

  document.getElementById("building-name").textContent = b.name;
  document.getElementById("building-level").textContent = b.lv;

  const info = currentState.building_stats[b.name];
  document.getElementById("building-energy").textContent =
    info ? info.E_prod * (1 + b.lv / 2) : "?";

  // ROUND env_bar for occupied tile
  document.getElementById("building-env-bar").textContent =
    currentState.env_bar !== undefined ? (Math.round(currentState.env_bar * 100000) / 100000) : "?";
}

function updateUpgradeButton(b) {
  const upgradeBtn = document.querySelector("#module-occupied button");
  const lv = b.lv;
  const buildingName = b.name;
  const upgradeCost = currentState.building_stats[buildingName]["upgrade_cost"] + 10**((lv+1)/2);

  if (currentState.energy < upgradeCost) {
    upgradeBtn.disabled = true;
    upgradeBtn.textContent = "Not enough energy";
  } else {
    upgradeBtn.disabled = false;
    upgradeBtn.textContent = "Upgrade";
  }
}

/* ---------- EXPOSE FOR INLINE HTML ---------- */
window.selectCategory = selectCategory;
window.backToCategories = backToCategories;
window.showBuildingDetails = showBuildingDetails;
window.backToBuildings = backToBuildings;
