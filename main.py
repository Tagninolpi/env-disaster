from fastapi import FastAPI, Request
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from game import Player, Building

app = FastAPI()
BASE_DIR = Path(__file__).parent

# Serve static files
app.mount("/static", StaticFiles(directory=BASE_DIR / "static"), name="static")

# All connected players
players = {}  # player_id -> Player instance


# ---------- FRONTEND ----------
@app.get("/")
def index():
    return FileResponse(BASE_DIR / "index.html")

# ---------- INTERNAL STATE FUNCTION ----------
def get_state(player: Player):
    """
    Returns full game state for a player
    """
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
        "building_stats": player.building_stats
    }


# ---------- GAME API ----------
@app.post("/api/start")
async def start_game(request: Request):
    """
    Called once when the player clicks 'Start Game'
    """
    data = await request.json()
    player_id = data.get("player_id")

    if not player_id:
        return JSONResponse({"error": "player_id missing"}, status_code=400)

    players[player_id] = Player(
        energy=1000,
        env_bar=0,
        tile_price=100,
        nb_rings=4
    )

    return get_state(players[player_id])


@app.post("/api/buy_tile")
async def api_buy_tile(request: Request):
    data = await request.json()
    player_id = data.get("player_id")
    tile_id = data.get("tile_id")

    player = players.get(player_id)
    if not player:
        return JSONResponse({"error": "player not found"}, status_code=404)

    player.buy_tile(tile_id)
    return get_state(player)


@app.post("/api/buy_building")
async def api_buy_building(request: Request):
    data = await request.json()
    player_id = data.get("player_id")
    tile_id = data.get("tile_id")
    building = data.get("building")

    player = players.get(player_id)
    if not player:
        return JSONResponse({"error": "player not found"}, status_code=404)

    player.buy_building(tile_id, building)
    return get_state(player)


@app.post("/api/upgrade_building")
async def api_upgrade_building(request: Request):
    data = await request.json()
    player_id = data.get("player_id")
    tile_id = data.get("tile_id")

    player = players.get(player_id)
    if not player:
        return JSONResponse({"error": "player not found"}, status_code=404)

    player.upgrade_building(tile_id)
    return get_state(player)


@app.post("/api/game_tick")
async def api_game_tick(request: Request):
    data = await request.json()
    player_id = data.get("player_id")

    player = players.get(player_id)
    if not player:
        return JSONResponse({"error": "player not found"}, status_code=404)

    player.money_env_update()
    return {"energy": player.energy, "env_bar": player.env_bar}

