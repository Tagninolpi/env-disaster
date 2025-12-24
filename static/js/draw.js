export let currentTiles = [];
export let selectedTileId = null; // currently selected tile

/* ---------- Refresh / draw entire map ---------- */
export function refresh_view(tiles = [], selectedId = null) {
  const canvas = document.getElementById("game-canvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");

  const canvasSize = Math.min(canvas.width, canvas.height);
  const hexSize = canvasSize / 12;
  const nbRings = computeMaxRings(canvasSize, hexSize);

  const mapTiles = tiles.length > 0 ? tiles : createHexList(nbRings);

  clearCanvas(ctx, canvas.width, canvas.height);

  drawMap(ctx, mapTiles, canvas.width / 2, canvas.height / 2, nbRings, hexSize, selectedId);

  currentTiles = mapTiles;
  window.currentHexSettings = { hexSize, nbRings };
}

/* ---------- Hit detection for clicks ---------- */
export function getTileFromClick(event) {
  const canvas = document.getElementById("game-canvas");
  if (!canvas) return null;

  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  const x = (event.clientX - rect.left) * scaleX;
  const y = (event.clientY - rect.top) * scaleY;

  const hitSize = (window.currentHexSettings?.hexSize || 20) * 1.1;

  for (let tile of currentTiles) {
    if (tile.x == null || tile.y == null) continue;
    const dx = x - tile.x;
    const dy = y - tile.y;
    if (Math.sqrt(dx * dx + dy * dy) <= hitSize) {
      return tile;
    }
  }

  return null; // clicked outside any tile
}

/* ---------- Draw hex map and store tile positions ---------- */
export function drawMap(ctx, tiles, centerX, centerY, nbRings, size, selectedId = null) {
  if (!tiles.length) return;

  const directions = [
    [1, -1], [1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1],
  ];

  let tileIndex = 0;

  // Draw center hex
  drawHex(ctx, centerX, centerY, size, tiles[tileIndex].color, tiles[tileIndex].id === selectedId);
  tiles[tileIndex].x = centerX;
  tiles[tileIndex].y = centerY;
  tileIndex++;

  for (let ring = 1; ring <= nbRings; ring++) {
    let q = -ring;
    let r = 0;

    for (let side = 0; side < 6; side++) {
      for (let step = 0; step < ring; step++) {
        if (tileIndex >= tiles.length) return;

        const x = centerX + size * Math.sqrt(3) * (q + r / 2);
        const y = centerY + size * 1.5 * r;

        drawHex(ctx, x, y, size, tiles[tileIndex].color, tiles[tileIndex].id === selectedId);
        tiles[tileIndex].x = x;
        tiles[tileIndex].y = y;

        tileIndex++;
        q += directions[side][0];
        r += directions[side][1];
      }
    }
  }
}

/* ---------- Draw a single hex ---------- */
export function drawHex(ctx, x, y, size, color = "lightgreen", isSelected = false) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = Math.PI / 6 + i * Math.PI / 3; // flat-topped
    const px = x + size * Math.cos(angle);
    const py = y + size * Math.sin(angle);
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  }
  ctx.closePath();

  ctx.fillStyle = color;
  ctx.fill();

  ctx.strokeStyle = "black";
  ctx.lineWidth = isSelected ? 6 : 1; // thicker border for selected tile
  ctx.stroke();

  ctx.lineWidth = 1;
}

/* ---------- Utility ---------- */
export function clearCanvas(ctx, width, height) {
  ctx.clearRect(0, 0, width, height);
}

/* ---------- Create new hex list with IDs ---------- */
export function createHexList(nbRings) {
  const colors = ["lightgreen", "lightblue", "lightyellow", "pink", "orange", "violet"];
  const totalHexes = 1 + 3 * nbRings * (nbRings + 1);

  return Array.from({ length: totalHexes }, (_, i) => ({
    id: i,
    color: colors[Math.floor(Math.random() * colors.length)],
    x: null,
    y: null,
    state: "empty",
    price: 100,
    building: null
  }));
}

function computeMaxRings(canvasSize, hexSize) {
  const canvasRadius = canvasSize / 2;
  const hexStep = hexSize * 1.5;
  return Math.floor(canvasRadius / hexStep) - 1;
}

/* ---------- Setup canvas size once ---------- */
export function setupCanvas() {
  const canvas = document.getElementById("game-canvas");
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height;
}

window.addEventListener("load", setupCanvas);
window.addEventListener("resize", setupCanvas);
