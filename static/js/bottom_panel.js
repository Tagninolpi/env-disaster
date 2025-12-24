let selectedCategory = null;

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

function showCategoryButtons() {
  document.getElementById("category-buttons").classList.remove("hidden");
  document.getElementById("building-buttons").classList.add("hidden");
}

export function selectCategory(category) {
  selectedCategory = category;
  document.getElementById("category-buttons").classList.add("hidden");
  document.getElementById("building-buttons").classList.remove("hidden");
}

export function backToCategories() {
  selectedCategory = null;
  showCategoryButtons();
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

export function buyTile() {
  fetch("/api/buy-tile", { method: "POST" }).then(() => console.log("Buy tile request sent"));
}

export function upgradeBuilding() {
  fetch("/api/upgrade-building", { method: "POST" }).then(() => console.log("Upgrade request sent"));
}
