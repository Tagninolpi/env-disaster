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
"Coal": {"nb": 0,"E_buy_cost": 6000,"env_build_cost": 9.5,"env_use_cost": 0.1,"E_prod": 15,"durability": 70},
"Offshore oil": {"nb": 0,"E_buy_cost": 8500,"env_build_cost": 8.5,"env_use_cost": 0.09,"E_prod": 45,"durability": 40},
"Fracking gas": {"nb": 0,"E_buy_cost": 5500,"env_build_cost": 9,"env_use_cost": 0.08,"E_prod": 80,"durability": 20},
"Lithium extraction": {"nb": 0,"E_buy_cost": 4500,"env_build_cost": 7.5,"env_use_cost": 0.06,"E_prod": 30,"durability": 10},
# Renewable
"Hydro dam": {"nb": 0,"E_buy_cost": 10000,"env_build_cost": 8,"env_use_cost": 0.04,"E_prod": 100,"durability": 100},
"Geothermal": {"nb": 0,"E_buy_cost": 6500,"env_build_cost": 3,"env_use_cost": 0.01,"E_prod": 35,"durability": 80},
"Tidal": {"nb": 0,"E_buy_cost": 7500,"env_build_cost": 4,"env_use_cost": -0.4,"E_prod": 8,"durability": 70},
"Wood": {"nb": 0,"E_buy_cost": 3500,"env_build_cost": 5.5,"env_use_cost": -0.01,"E_prod": 5,"durability": 40},
# Green
"Solar": {"nb": 0,"E_buy_cost": 2000,"env_build_cost": 1.2,"env_use_cost": -0.045,"E_prod": 7,"durability": 26},
"Wind": {"nb": 0,"E_buy_cost": 2500,"env_build_cost": 1.5,"env_use_cost": -0.05,"E_prod": 34,"durability": 35},
"Nuclear": {"nb": 0,"E_buy_cost": 9500,"env_build_cost": 7,"env_use_cost": -0.01,"E_prod": 90,"durability": 51},
"Gravity": {"nb": 0,"E_buy_cost": 8000,"env_build_cost": 0.5,"env_use_cost": -0.03,"E_prod": 25,"durability": 62},
# Alternative
"Hydrogen": {"nb": 0,"E_buy_cost": 5000,"env_build_cost": 2.5,"env_use_cost": -0.015,"E_prod": 62,"durability": 20},
"Synthetic fuel": {"nb": 0,"E_buy_cost": 6000,"env_build_cost": 4.5,"env_use_cost": -0.06,"E_prod": 12,"durability": 37},
"Mirror plant": {"nb": 0,"E_buy_cost": 3000,"env_build_cost": 2,"env_use_cost": -0.045,"E_prod": 27,"durability": 52},
"Salinity gradient": {"nb": 0,"E_buy_cost": 4000,"env_build_cost": 0.1,"env_use_cost": -0.013,"E_prod": 48,"durability": 58}
}

    #helper/init
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

    #buying /upgrades
    def buy_tile(self,id):
        tile_price = self.tile_mult(self.tile_price,self.nb_bought_tiles)
        if self.energy > tile_price:
            self.energy -= tile_price
            self.nb_bought_tiles += 1
            self.tiles[id].status = "empty"
            self.update_locked_tiles()
    
    def buy_building(self, tile_id, building):
        base = self.buildings[building]

        # base buy cost scales with number already built
        build_price = self.buy_build_price_mult(base["E_buy_cost"],base["nb"])

        if self.energy >= build_price:
            self.energy -= build_price
            self.env_bar += self.buy_build_cost_mult(base["env_build_cost"],base["nb"])

            base["nb"] += 1
            self.tiles[tile_id].status = Building(
                building,
                base["durability"]
            )

    def upgrade_building(self, tile_id):
        tile = None
        if 0 <= tile_id < len(self.tiles):
            tile =self.tiles[tile_id]

        if not tile or not isinstance(tile.status, Building):
            return

        building = tile.status
        base = self.buildings[building.name]

        # upgrade cost scales ONLY with level
        upgrade_price = self.upgrade_price_mult(base["E_buy_cost"],building.lv)

        if self.energy >= upgrade_price:
            self.energy -= upgrade_price
            building.lv += 1

            # durability scales with level
            building.durability = self.upgrade_durability_mult(base["durability"],building.lv)

            # environment impact scales with level
            self.env_bar += self.upgrade_cost_mult(base["env_build_cost"],building.lv)

    #multiplier functions
    def tile_mult(self,base,nb):
        return round(base * (1 + nb))
    
    def buy_build_price_mult(self,base,nb):
        return round(base * (1 + nb))
    
    def buy_build_cost_mult(self,base,nb):
        return round(base * (1 + nb))
    
    def upgrade_price_mult(self,base,lv):
        return round(base * (1 + lv))

    def upgrade_durability_mult(self,base,lv):
            return round(base * (1 + lv))
    
    def upgrade_cost_mult(self,base,lv):
        return round(base * (1 + lv))

    # tick gain
    def money_env_update(self):
        for tile in self.tiles:
            if isinstance(tile.status, Building):
                b = tile.status
                base = self.buildings[b.name]

                # energy production scales with level
                energy_gain = round(base["E_prod"] * b.lv)
                self.energy += energy_gain

                # environment usage scales with level
                env_cost = round(base["env_use_cost"] * b.lv, 3)
                self.env_bar += env_cost



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
        self.lv = 1
        self.durability = durability

