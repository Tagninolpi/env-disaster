import random
tile_types = ["forest","plain","desert","mountain","sea","river"]

class Player:
    def __init__(self,energy,env_bar,tile_price,nb_rings):
        # Flat-top neighbors (flat side is horizontal)
        self.HEX_DIRECTIONS = [
            (+1, 0),   # east
            (+1, -1),  # northeast
            (0, -1),   # northwest
            (-1, 0),   # west
            (-1, +1),  # southwest
            (0, +1)    # southeast
        ]



        #display
        self.energy = energy
        self.env_bar = env_bar
        self.tiles,self.coord_to_id = self.init_tiles(nb_rings)        
        
        #buy tiles
        self.tile_price = tile_price
        self.nb_bought_tiles = 0
        
        #building stats
        self.building_pref = {
            "desert": ["Solar", "Mirror plant"],
            "plain": ["Wind", "Fracking gas", "Hydrogen"],
            "forest": ["Coal", "Wood", "Synthetic fuel"],
            "mountain": ["Lithium extraction", "Geothermal", "Gravity"],
            "sea": ["Offshore oil", "Tidal", "Salinity gradient"],
            "river": ["Hydro dam", "Nuclear"]
            }
        self.buildings = {
# Fossil
"Coal": {"nb": 0,"E_buy_cost": 100,"env_build_cost": 1,"env_use_cost": 0.1,"E_prod": 1,"durability": 100},
"Offshore oil": {"nb": 0,"E_buy_cost": 100,"env_build_cost": 1,"env_use_cost": 0.1,"E_prod": 1,"durability": 100},
"Fracking gas": {"nb": 0,"E_buy_cost": 100,"env_build_cost": 1,"env_use_cost": 0.1,"E_prod": 1,"durability": 100},
"Lithium extraction": {"nb": 0,"E_buy_cost": 100,"env_build_cost": 1,"env_use_cost": 0.1,"E_prod": 1,"durability": 100},
# Renewable
"Hydro dam": {"nb": 0,"E_buy_cost": 100,"env_build_cost": 1,"env_use_cost": 0.1,"E_prod": 1,"durability": 100},
"Geothermal": {"nb": 0,"E_buy_cost": 100,"env_build_cost": 1,"env_use_cost": 0.1,"E_prod": 1,"durability": 100},
"Tidal": {"nb": 0,"E_buy_cost": 100,"env_build_cost": 1,"env_use_cost": 0.1,"E_prod": 1,"durability": 100},
"Wood": {"nb": 0,"E_buy_cost": 100,"env_build_cost": 1,"env_use_cost": 0.1,"E_prod": 1,"durability": 100},
# Green
"Solar": {"nb": 0,"E_buy_cost": 100,"env_build_cost": 1,"env_use_cost": 0.1,"E_prod": 1,"durability": 100},
"Wind": {"nb": 0,"E_buy_cost": 100,"env_build_cost": 1,"env_use_cost": 0.1,"E_prod": 1,"durability": 100},
"Nuclear": {"nb": 0,"E_buy_cost": 100,"env_build_cost": 1,"env_use_cost": 0.1,"E_prod": 1,"durability": 100},
"Gravity": {"nb": 0,"E_buy_cost": 100,"env_build_cost": 1,"env_use_cost": 0.1,"E_prod": 1,"durability": 100},
# Alternative
"Hydrogen": {"nb": 0,"E_buy_cost": 100,"env_build_cost": 1,"env_use_cost": 0.1,"E_prod": 1,"durability": 100},
"Synthetic fuel": {"nb": 0,"E_buy_cost": 100,"env_build_cost": 1,"env_use_cost": 0.1,"E_prod": 1,"durability": 100},
"Mirror plant": {"nb": 0,"E_buy_cost": 100,"env_build_cost": 1,"env_use_cost": 0.1,"E_prod": 1,"durability": 100},
"Salinity gradient": {"nb": 0,"E_buy_cost": 100,"env_build_cost": 1,"env_use_cost": 0.1,"E_prod": 1,"durability": 100}
}


    def init_tiles(self,nb_rings):
        tiles = []
        coord_to_id = {}
        tile_id = 0
         # ---- center tile ----
        tiles.append(Tile(tile_id, 0, 0, "buyable"))
        coord_to_id[(0, 0)] = tile_id
        tile_id += 1

        for radius in range(1, nb_rings + 1):
            q, r = -radius, radius

            for dq, dr in self.HEX_DIRECTIONS:
                for _ in range(radius):
                    tiles.append(Tile(tile_id, q, r, "locked"))
                    coord_to_id[(q, r)] = tile_id
                    tile_id += 1

                    q += dq
                    r += dr

        return tiles,coord_to_id
    
    def update_locked_tiles(self):
        to_unlock = []

        for tile in self.tiles:
            if tile.status != "locked":
                continue

            # check neighbors
            for dq, dr in self.HEX_DIRECTIONS:
                coord = (tile.q + dq, tile.r + dr)

                if coord not in self.coord_to_id:
                    continue

                neighbor = self.tiles[self.coord_to_id[coord]]

                if neighbor.status not in ("locked", "buyable"):
                    to_unlock.append(tile)
                    break  # only need ONE valid neighbor

        # apply changes AFTER the loop
        for tile in to_unlock:
            tile.status = "buyable"

    def buy_tile(self,id):
        tile_price = round(self.tile_price * self.nb_bought_tiles)
        if self.energy > tile_price:
            self.energy -= tile_price
            self.nb_bought_tiles += 1
            self.tiles[id].status = "empty"
            self.update_locked_tiles()
    
    def buy_building(self, tile_id, building):
        base = self.buildings[building]

        # base buy cost scales with number already built
        build_price = round(base["E_buy_cost"] * (1 + base["nb"] / 2))

        if self.energy >= build_price:
            self.energy -= build_price
            self.env_bar += round(base["env_build_cost"], 3)

            base["nb"] += 1
            self.tiles[tile_id].status = Building(
                building,
                base["durability"]
            )

    def upgrade_building(self, tile_id):
        tile = self.get_tile(tile_id)
        if not tile or not isinstance(tile.status, Building):
            return

        building = tile.status
        base = self.buildings[building.name]

        # upgrade cost scales ONLY with level
        upgrade_price = round(base["E_buy_cost"] * (building.lv + 1) ** 1.5)

        if self.energy >= upgrade_price:
            self.energy -= upgrade_price
            building.lv += 1

            # durability scales with level
            building.durability = round(base["durability"] * (1 + building.lv / 2))

            # environment impact scales with level
            self.env_bar += round(base["env_use_cost"] * building.lv, 3)



    def money_env_update(self):
        for tile in self.tiles:
            if isinstance(tile.status, Building):
                b = tile.status
                base = self.buildings[b.name]

                # energy production scales with level
                energy_gain = round(base["E_prod"] * (1 + b.lv / 2))
                self.energy += energy_gain

                # environment usage scales with level
                env_cost = round(base["env_use_cost"] * (1 + b.lv / 5), 3)
                self.env_bar += env_cost

    
    def get_tile(self, tile_id):
        if 0 <= tile_id < len(self.tiles):
            return self.tiles[tile_id]
        return None



class Tile:
    def __init__(self,id,q,r,status):
        self.id = id
        self.q = q
        self.r = r
        self.type = random.choice(tile_types)
        self.status = status # locked, buyable, empty, Building()


class Building:
    def __init__(self,name,durability):
        self.name = name
        self.lv = 0
        self.durability = durability
