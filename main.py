import time
import asyncio
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from game import Player, Building

# ===============================
# APP SETUP
# ===============================

app = FastAPI()
BASE_DIR = Path(__file__).parent

app.mount("/static", StaticFiles(directory=BASE_DIR / "static"), name="static")

# ===============================
# PLAYER STORAGE
# ===============================
# player_id -> {
#   "player": Player,
#   "last_seen": float
# }
players = {}

PLAYER_TIMEOUT = 15  # seconds without activity before cleanup


# ===============================
# UTILITIES
# ===============================

def touch_player(player_id: str):
    """Update last activity timestamp"""
    if player_id in players:
        players[player_id]["last_seen"] = time.time()


def get_state(player: Player):
    """Return full game state"""
    tiles_info = []

    for tile in player.tiles:
        if isinstance(tile.status, Building):
            status = {
                "type": "building",
                "name": tile.status.name,
                "lv": tile.status.lv,
                "durability": tile.status.durability
            }
        else:
            status = tile.status

        tiles_info.append({
            "id": tile.id,
            "q": tile.q,
            "r": tile.r,
            "tile_type": tile.type,
            "status": status
        })

    return {
        "energy": player.energy,
        "env_bar": player.env_bar,
        "tiles": tiles_info,
        "tile_price": player.tile_price,
        "nb_bought_tiles": player.nb_bought_tiles,
        "building_pref": player.building_pref,
        "buildings": player.buildings,
    }


# ===============================
# BACKGROUND CLEANUP TASK
# ===============================

@app.on_event("startup")
async def start_cleanup_task():
    async def cleanup_loop():
        while True:
            now = time.time()
            to_remove = []

            for player_id, entry in players.items():
                if now - entry["last_seen"] > PLAYER_TIMEOUT:
                    to_remove.append(player_id)

            for player_id in to_remove:
                print(f"[CLEANUP] Removing inactive player {player_id}")
                del players[player_id]

            await asyncio.sleep(5)

    asyncio.create_task(cleanup_loop())


# ===============================
# FRONTEND
# ===============================

@app.get("/")
def index():
    return FileResponse(BASE_DIR / "index.html")


@app.get("/favicon.ico")
def favicon():
    return FileResponse(BASE_DIR / "static" / "favicon.ico")

# ===============================
# GAME API
# ===============================

@app.post("/api/start")
async def start_game(request: Request):
    data = await request.json()
    player_id = data.get("player_id")

    if not player_id:
        return JSONResponse({"error": "player_id missing"}, status_code=400)

    players[player_id] = {
        "player": Player(
            energy=10000,
            env_bar=0,
            tile_price=1000,
            nb_rings=4
        ),
        "last_seen": time.time()
    }

    return get_state(players[player_id]["player"])


@app.post("/api/buy_tile")
async def buy_tile(request: Request):
    data = await request.json()
    player_id = data.get("player_id")
    tile_id = data.get("tile_id")

    entry = players.get(player_id)
    if not entry:
        return {"status": "inactive"}


    touch_player(player_id)
    entry["player"].buy_tile(tile_id)
    return get_state(entry["player"])


@app.post("/api/buy_building")
async def buy_building(request: Request):
    data = await request.json()
    player_id = data.get("player_id")
    tile_id = data.get("tile_id")
    building = data.get("building")

    entry = players.get(player_id)
    if not entry:
        return {"status": "inactive"}


    touch_player(player_id)
    entry["player"].buy_building(tile_id, building)
    return get_state(entry["player"])


@app.post("/api/upgrade_building")
async def upgrade_building(request: Request):
    data = await request.json()
    player_id = data.get("player_id")
    tile_id = data.get("tile_id")

    entry = players.get(player_id)
    if not entry:
        return {"status": "inactive"}


    touch_player(player_id)
    entry["player"].upgrade_building(tile_id)
    return get_state(entry["player"])


@app.post("/api/game_tick")
async def game_tick(request: Request):
    data = await request.json()
    player_id = data.get("player_id")

    entry = players.get(player_id)
    if not entry:
        # Player already cleaned up → silently ignore
        return {"status": "inactive"}

    touch_player(player_id)
    player = entry["player"]

    player.money_env_update()
    return {
        "energy": player.energy,
        "env_bar": player.env_bar
    }



@app.post("/api/disconnect")
async def disconnect(request: Request):
    data = await request.json()
    player_id = data.get("player_id")
    if player_id in players:
        del players[player_id]
        print(f"[DISCONNECT] Player {player_id} removed")
    return {"status": "ok"}

