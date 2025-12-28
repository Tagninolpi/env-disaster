let currentHexSettings = null;

/* ---------- TILE COLOR ---------- */
const ENV_COLORS = {
  sea: "#003366",       // dark blue
  river: "#66ccff",     // light blue
  forest: "#006600",    // dark green
  plain: "#99ff66",     // light green
  desert: "#ffcc00",    // yellow
  mountain: "#654321"   // dark brown
};

function tileToColor(tile) {
  const baseColor = ENV_COLORS[tile.tile_type] || "#000000";

  // Apply mask depending on status
  if (typeof tile.status === "object") return baseColor; // building: normal color
  if (tile.status === "locked") return shadeColor(baseColor, -8000);
  if (tile.status === "buyable") return shadeColor(baseColor, -40);
  if (tile.status === "empty") return baseColor;                

  return baseColor;
}

/* ---------- COLOR UTILS ---------- */
function shadeColor(color, percent) {
  const num = parseInt(color.slice(1),16);
  let r = (num >> 16) & 0xFF;
  let g = (num >> 8) & 0xFF;
  let b = num & 0xFF;

  r = Math.min(255, Math.max(0, r + percent));
  g = Math.min(255, Math.max(0, g + percent));
  b = Math.min(255, Math.max(0, b + percent));

  return `rgb(${r},${g},${b})`;
}

/* ---------- DRAW / REFRESH ---------- */
export function refresh_view(hexes, selectedId = null) {
  if (!hexes || hexes.length === 0) return;

  const canvas = document.getElementById("game-canvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const size = Math.min(canvas.width, canvas.height) / 12;

  clearCanvas(ctx, canvas.width, canvas.height);
  drawMap(ctx, hexes, canvas.width / 2, canvas.height / 2, size, selectedId);

  currentHexSettings = { hexSize: size };
}

/* ---------- HIT DETECTION ---------- */
export function getTileFromClick(event, hexes) {
  if (!hexes) return null;

  const canvas = document.getElementById("game-canvas");
  if (!canvas) return null;

  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  const x = (event.clientX - rect.left) * scaleX;
  const y = (event.clientY - rect.top) * scaleY;

  const hitSize = (currentHexSettings?.hexSize || 20) * 1.1;

  for (const tile of hexes) {
    if (tile.x == null) continue;
    const dx = x - tile.x;
    const dy = y - tile.y;
    if (Math.hypot(dx, dy) <= hitSize) return tile;
  }
  return null;
}

/* ---------- MAP DRAWING ---------- */
export function drawMap(ctx, hexes, cx, cy, size, selectedId) {
  for (const tile of hexes) {
    //const x = cx + size * Math.sqrt(3) * (tile.q + tile.r / 2);
    //const y = cy + size * 1.5 * tile.r;
    const x = cx + size * 3/2 * tile.q;
    const y = cy + size * Math.sqrt(3) * (tile.r + tile.q / 2);

    const color = tileToColor(tile);
    const selected = tile.id === selectedId;

    drawHex(ctx, x, y, size, color, selected);

    // store for hit detection
    tile.x = x;
    tile.y = y;
  }
}

/* ---------- HEX ---------- */
export function drawHex(ctx, x, y, size, color, selected) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = i * Math.PI / 3; 
    const px = x + size * Math.cos(a);
    const py = y + size * Math.sin(a);
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.lineWidth = selected ? 6 : 1;
  ctx.strokeStyle = "black";
  ctx.stroke();
}

/* ---------- UTILS ---------- */
function clearCanvas(ctx, w, h) {
  ctx.clearRect(0, 0, w, h);
}
