// ===============================
// draw.js
// ===============================

/* ---------- ASSETS ---------- */
const hexImages = {
  base: new Image(),
  sea: new Image(),
  river: new Image(),
  forest: new Image(),
  plain: new Image(),
  desert: new Image(),
  mountain: new Image()
};

let assetsLoaded = false;
let currentHexSettings = null;

/* ---------- TILE COLOR (FALLBACK) ---------- */
const ENV_COLORS = {
  sea: "#003366",
  river: "#66ccff",
  forest: "#006600",
  plain: "#99ff66",
  desert: "#ffcc00",
  mountain: "#654321"
};

function tileToColor(tile) {
  const baseColor = ENV_COLORS[tile.tile_type] || "#000000";

  if (typeof tile.status === "object") return baseColor;
  if (tile.status === "locked") return shadeColor(baseColor, -80);
  if (tile.status === "buyable") return shadeColor(baseColor, -40);
  if (tile.status === "empty") return baseColor;

  return baseColor;
}

/* ---------- COLOR UTILS ---------- */
function shadeColor(color, percent) {
  const num = parseInt(color.slice(1), 16);
  let r = (num >> 16) & 0xff;
  let g = (num >> 8) & 0xff;
  let b = num & 0xff;

  r = Math.min(255, Math.max(0, r + percent));
  g = Math.min(255, Math.max(0, g + percent));
  b = Math.min(255, Math.max(0, b + percent));

  return `rgb(${r},${g},${b})`;
}

/* ---------- ASSET LOADING ---------- */
export function initDrawAssets() {
  return new Promise((resolve, reject) => {
    const entries = [
      ["base", "hex_base.png"],
      ["sea", "sea.png"],
      ["river", "river.png"],
      ["forest", "forest.png"],
      ["plain", "plain.png"],
      ["desert", "desert.png"],
      ["mountain", "mountain.png"]
    ];

    let loaded = 0;
    const total = entries.length;

    for (const [key, file] of entries) {
      const img = hexImages[key];
      img.src = `/static/hexes_png/${file}`;

      img.onload = () => {
        if (img.naturalWidth === 0) {
          reject(new Error(`${file} loaded but invalid`));
          return;
        }
        loaded++;
        if (loaded === total) {
          assetsLoaded = true;
          resolve();
        }
      };

      img.onerror = () => reject(new Error(`Failed to load ${file}`));
    }
  });
}

/* ---------- DRAW / REFRESH ---------- */
export function refresh_view(hexes, selectedId = null) {
  if (!hexes || hexes.length === 0) return;

  const canvas = document.getElementById("game-canvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const size = Math.min(canvas.width, canvas.height) / 16;

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
    const x = cx + size * 1.5 * tile.q;
    const y = cy + size * Math.sqrt(3) * (tile.r + tile.q / 2);

    drawHex(ctx, x, y, size, tile, tile.id === selectedId);

    tile.x = x;
    tile.y = y;
  }
}

/* ---------- HEX STROKE ---------- */
function strokeHex(ctx, x, y, radius) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = i * Math.PI / 3;
    const px = x + radius * Math.cos(a);
    const py = y + radius * Math.sin(a);
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.stroke();
}

/* ---------- HEX DRAW ---------- */
export function drawHex(ctx, x, y, size, tile, selected) {

  if (assetsLoaded) {
    const imgSize = size * 2;

    const img =
      hexImages[tile.tile_type] ??
      hexImages.base;

    ctx.drawImage(
      img,
      x - imgSize / 2,
      y - imgSize / 2,
      imgSize,
      imgSize
    );

    if (selected) {
      ctx.lineWidth = 6;
      ctx.strokeStyle = "black";
      strokeHex(ctx, x, y, size * 0.9);
    }

    // ---- APPLY MASK ----
    if (tile.status === "locked") {
      ctx.save();
      ctx.globalAlpha = 0.9;       // fairly dark
      ctx.fillStyle = "black";
      drawHexPath(ctx, x, y, size);
      ctx.fill();
      ctx.restore();
    } else if (tile.status === "buyable") {
      ctx.save();
      ctx.globalAlpha = 0.5;      // slightly darker
      ctx.fillStyle = "black";
      drawHexPath(ctx, x, y, size);
      ctx.fill();
      ctx.restore();
    }

    return;
  }

  // ---- FALLBACK VECTOR HEX ----
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = i * Math.PI / 3;
    const px = x + size * Math.cos(a);
    const py = y + size * Math.sin(a);
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = tileToColor(tile);
  ctx.fill();

  if (selected) {
    ctx.lineWidth = 4;
    ctx.strokeStyle = "yellow";
    ctx.stroke();
  }
}

function drawHexPath(ctx, x, y, radius) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = i * Math.PI / 3;
    const px = x + radius * Math.cos(a);
    const py = y + radius * Math.sin(a);
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  }
  ctx.closePath();
}

/* ---------- UTILS ---------- */
function clearCanvas(ctx, w, h) {
  ctx.clearRect(0, 0, w, h);
}

export function resizeCanvas() {
  const canvas = document.getElementById("game-canvas");
  if (!canvas) return;

  const container = document.getElementById("canvas-container");
  // take the smaller of container width or height to keep square
  const size = Math.min(container.clientWidth, container.clientHeight);

  // set actual canvas resolution
  canvas.width = size;
  canvas.height = size;

  // redraw hex map if we have hexes
  if (window.gameState?.hexes) {
    refresh_view(window.gameState.hexes);
  }
}

// resize on window resize
window.addEventListener("resize", () => {
  resizeCanvas();
});
