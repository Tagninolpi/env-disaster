let selectedCategory = null;
let currentState = null;

function roundx(value,x) {
  return Math.round(value * 10**(x)) / 10**(x);
}

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

/* =========================================================
   BACKEND MIRROR – VALUE CALCULATION HELPERS
   (MUST MATCH PYTHON EXACTLY)
   ========================================================= */

// ---- tile ----
function tilePrice(base, nbBought) {
  return roundx(base * (1 + nbBought), 0);
}

// ---- buying ----
function buyBuildPrice(base, nbBuilt) {
  return roundx(base * (1 + nbBuilt), 0);
}

function buyBuildEnvCost(base, nbBuilt) {
  return roundx(base * (1 + nbBuilt), 3);
}

// ---- upgrade ----
function upgradePrice(base, lv) {
  return roundx(base * (1 + lv), 0);
}

function upgradeEnvPrice(base, lv) {
  return roundx(base * (1 + lv), 0);
}

function upgradeDurability(base, lv) {
  return roundx(base * (1 + lv), 0);
}

function upgradeEnvCost(base, lv) {
  return roundx(base * (1 + lv), 3);
}

// ---- production / usage per tick ----
function energyProduction(baseProd, lv) {
  return roundx(baseProd * lv, 0);
}

function envUsage(baseEnv, lv) {
  return roundx(baseEnv * lv, 4);
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
    const price = tilePrice(
      currentState.tile_price,
      currentState.nb_bought_tiles
      );

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

  if (typeof status === "object") { // occupied with a building
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

/* ---------- BUILDING DETAILS (BUY) ---------- */
export function showBuildingDetails(name) {
  if (!currentState) return;

  const stats = currentState.buildings[name];
  if (!stats) return;

  showModule("building-details");

  const lv = 1; // buying always starts at level 1
  const price = buyBuildPrice(stats.E_buy_cost, stats.nb || 0);
  const buyBtn = document.querySelector("#building-details button:first-of-type");

  document.getElementById("detail-building-name").textContent = name;
  document.getElementById("detail-price").textContent = price;
  document.getElementById("detail-production").textContent =energyProduction(stats.E_prod, 1);
  document.getElementById("detail-env-build").textContent =buyBuildEnvCost(stats.env_build_cost, stats.nb || 0);
  document.getElementById("detail-env-usage").textContent =envUsage(stats.env_use_cost, 1);
  document.getElementById("detail-durability").textContent =upgradeDurability(stats.durability, 1);

  // Preferred tiles
  const preferred = [];
  for (const [tile, arr] of Object.entries(currentState.building_pref)) {
    if (arr.includes(name)) preferred.push(tile);
  }
  document.getElementById("detail-preferred-tile").textContent = preferred.join(", ") || "-";

  if (currentState.energy < price) {
    buyBtn.disabled = true;
    buyBtn.textContent = "Not enough energy";
  } else {
    buyBtn.disabled = false;
    buyBtn.textContent = "Buy Building";
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

/* ---------- OCCUPIED TILE INFO (UPGRADE) ---------- */
function updateBuildingInfo(building) {
  if (!currentState || !building) return;

  const stats = currentState.buildings[building.name];
  if (!stats) return;

  document.getElementById("building-name").textContent = building.name;
  document.getElementById("building-level").textContent = building.lv;
  document.getElementById("building-durability").textContent = building.durability;

  document.getElementById("building-energy").textContent =energyProduction(stats.E_prod, building.lv);
  document.getElementById("building-env").textContent =envUsage(stats.env_use_cost, building.lv);
  document.getElementById("building-durability").textContent = building.durability;

  document.getElementById("building-energy-next").textContent =energyProduction(stats.E_prod, building.lv + 1);
  document.getElementById("building-env-next").textContent =envUsage(stats.env_use_cost, building.lv + 1);
  document.getElementById("building-durability-next").textContent = upgradeDurability(stats.durability, building.lv + 1);

}

function updateUpgradeButton(building) {
  if (!currentState || !building) return;
  const stats = currentState.buildings[building.name];
  if (!stats) return;

  const upgradeBtn = document.querySelector("#module-occupied button");
  const upgradeCost = upgradePrice(stats.E_buy_cost,building.lv);
  const envupgradecost = upgradeEnvPrice(stats.env_build_cost,building.lv)


  if (currentState.energy < upgradeCost) {
    upgradeBtn.disabled = true;
    upgradeBtn.textContent = "Not enough energy";
  } else {
    upgradeBtn.disabled = false;
    upgradeBtn.textContent = "Upgrade";
  }

  document.getElementById("upgrade-cost").textContent = upgradeCost;
  document.getElementById("upgrade-env-cost").textContent = envupgradecost;
}

/* ---------- EXPOSE FOR INLINE HTML ---------- */
window.selectCategory = selectCategory;
window.backToCategories = backToCategories;
window.showBuildingDetails = showBuildingDetails;
window.backToBuildings = backToBuildings;
