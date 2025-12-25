let selectedCategory = null; // currently selected category

/* ---------- MODULE VISIBILITY ---------- */
export function showModule(moduleId) {
  document.querySelectorAll("#bottom-panel .module").forEach(m => m.classList.add("hidden"));
  const target = document.getElementById(moduleId);
  if (target) target.classList.remove("hidden");
}

export function updateBottomPanel(tile) {
  if (!tile) {
    showModule("module-default");
    return;
  }

  switch (tile.state) {
    case "not-buyable":
      showModule("module-not-buyable");
      break;

    case "buyable":
      document.getElementById("buyable-price").textContent = tile.price;
      showModule("module-buyable");
      break;

    case "empty":
      showModule("module-empty");
      showCategoryButtons();
      break;

    case "occupied":
      showModule("module-occupied");
      updateBuildingInfo(tile.building);
      break;

    default:
      showModule("module-default");
  }
}

/* ---------- CATEGORY SELECTION ---------- */
function showCategoryButtons() {
  document.getElementById("category-buttons").classList.remove("hidden");
  hideAllBuildingSubcontainers();
}

export function selectCategory(category) {
  selectedCategory = category;
  document.getElementById("category-buttons").classList.add("hidden");
  hideAllBuildingSubcontainers();

  const catDiv = document.getElementById(`buildings-${category}`);
  if (catDiv) catDiv.classList.remove("hidden");
}

export function backToCategories() {
  selectedCategory = null;
  document.getElementById("category-buttons").classList.remove("hidden");
  hideAllBuildingSubcontainers();
  document.getElementById("building-details").classList.add("hidden");
}

function hideAllBuildingSubcontainers() {
  document.querySelectorAll(".building-category").forEach(div => div.classList.add("hidden"));
}

/* ---------- BUILDING DETAILS ---------- */
export function showBuildingDetails(buildingName) {
  showModule("building-details");
  document.getElementById("detail-building-name").textContent = buildingName;
  document.getElementById("detail-price").textContent = 100; // example placeholder
  document.getElementById("detail-production").textContent = 10;
  document.getElementById("detail-preferred-tile").textContent = "Forest";
  document.getElementById("detail-env-build").textContent = 5;
  document.getElementById("detail-env-usage").textContent = 2;
}

export function backToBuildings() {
  if (!selectedCategory) {
    backToCategories();
    return;
  }

  // hide building details menu
  document.getElementById("building-details").classList.add("hidden");

  // show the currently selected category’s building container
  hideAllBuildingSubcontainers();
  const catDiv = document.getElementById(`buildings-${selectedCategory}`);
  if (catDiv) catDiv.classList.remove("hidden");

  // ensure the empty module is visible (so the top "Select a building category" text remains)
  showModule("module-empty");
}


export function buyBuilding() {
  console.log("Buy building request sent");
}

/* ---------- TILE / BUILDING ACTIONS ---------- */
export function buyTile() {
  fetch("/api/buy-tile", { method: "POST" }).then(() => console.log("Buy tile request sent"));
}

export function upgradeBuilding() {
  fetch("/api/upgrade-building", { method: "POST" }).then(() => console.log("Upgrade request sent"));
}

export function selectTower(towerName) {
  fetch("/api/buy-tower", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tower: towerName })
  }).then(() => console.log("Tower buy request sent"));
}

function updateBuildingInfo(building) {
  if (!building) return;
  document.getElementById("building-name").textContent = building.name;
  document.getElementById("building-level").textContent = building.level;
  document.getElementById("building-energy").textContent = building.energy;
}
