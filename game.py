import random
tile_types = ["forest","plain","desert","moutain","sea","river"]

class Player:
    def __init__(self,energy,env_bar,tile_price,nb_rings):
        #coord id conversion
        self.HEX_DIRECTIONS = [
            (1, 0),
            (1, -1),
            (0, -1),
            (-1, 0),
            (-1, 1),
            (0, 1)
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
            #Fossil
            "Coal":{"nb":0,"base_cost":100,"env_cost":1},
            "Offshore oil":{"nb":0,"base_cost":100,"env_cost":1},
            "Fracking gas":{"nb":0,"base_cost":100,"env_cost":1},
            "Lithium extraction":{"nb":0,"base_cost":100,"env_cost":1},
            #Renewable
            "Hydro dam":{"nb":0,"base_cost":100,"env_cost":1},
            "Geothermal":{"nb":0,"base_cost":100,"env_cost":1},
            "Tidal":{"nb":0,"base_cost":100,"env_cost":1},
            "Wood":{"nb":0,"base_cost":100,"env_cost":1},
            #Green
            "Solar":{"nb":0,"base_cost":100,"env_cost":1},
            "Wind":{"nb":0,"base_cost":100,"env_cost":1},
            "Nuclear":{"nb":0,"base_cost":100,"env_cost":1},
            "Gravity":{"nb":0,"base_cost":100,"env_cost":1},
            #Alternative
            "Hydrogen":{"nb":0,"base_cost":100,"env_cost":1},
            "Synthetic fuel":{"nb":0,"base_cost":100,"env_cost":1},
            "Mirror plant":{"nb":0,"base_cost":100,"env_cost":1},
            "Salinity gradient":{"nb":0,"base_cost":100,"env_cost":1}
        }
        self.building_stats = {
            #Fossil
            "Coal":{"E_prod":1,"env_cost":0.1,"upgrade_cost":1000,"max_durability":100},
            "Offshore oil":{"E_prod":1,"env_cost":0.1,"upgrade_cost":1000,"max_durability":100},
            "Fracking gas":{"E_prod":1,"env_cost":0.1,"upgrade_cost":1000,"max_durability":100},
            "Lithium extraction":{"E_prod":1,"env_cost":0.1,"upgrade_cost":1000,"max_durability":100},
            #Renewable
            "Hydro dam":{"E_prod":1,"env_cost":0.1,"upgrade_cost":1000,"max_durability":100},
            "Geothermal":{"E_prod":1,"env_cost":0.1,"upgrade_cost":1000,"max_durability":100},
            "Tidal":{"E_prod":1,"env_cost":0.1,"upgrade_cost":1000,"max_durability":100},
            "Wood":{"E_prod":1,"env_cost":0.1,"upgrade_cost":1000,"max_durability":100},
            #Green
            "Solar":{"E_prod":1,"env_cost":0.1,"upgrade_cost":1000,"max_durability":100},
            "Wind":{"E_prod":1,"env_cost":0.1,"upgrade_cost":1000,"max_durability":100},
            "Nuclear":{"E_prod":1,"env_cost":0.1,"upgrade_cost":1000,"max_durability":100},
            "Gravity":{"E_prod":1,"env_cost":0.1,"upgrade_cost":1000,"max_durability":100},
            #Alternative
            "Hydrogen":{"E_prod":1,"env_cost":0.1,"upgrade_cost":1000,"max_durability":100},
            "Synthetic fuel":{"E_prod":1,"env_cost":0.1,"upgrade_cost":1000,"max_durability":100},
            "Mirror plant":{"E_prod":1,"env_cost":0.1,"upgrade_cost":1000,"max_durability":100},
            "Salinity gradient":{"E_prod":1,"env_cost":0.1,"upgrade_cost":1000,"max_durability":100},
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
    
    def buy_building(self,id,building):
        build_price = round(self.buildings[building]["base_cost"] + 10**(self.buildings[building]["nb"]/2))
        if self.energy > build_price:
            self.energy -= build_price
            self.env_bar += round(self.buildings[building]["env_cost"],3)
            self.buildings[building]["nb"] += 1
            self.tiles[id].status = Building(building,self.building_stats[building]["max_durability"])
    
    def upgrade_building(self, tile_id, building=None):
        tile = self.get_tile(tile_id)
        if not tile or not tile.status:
            return

        if isinstance(tile.status, Building):
            # get building name if not provided
            building = building or tile.status.name
            upgrade_price = round(
                self.building_stats[building]["upgrade_cost"] + 10**((tile.status.lv + 1)/2)
            )

            if self.energy >= upgrade_price:
                # increment level directly on the building object
                tile.status.lv += 1
                lv = tile.status.lv  # updated level

                self.energy -= upgrade_price
                self.env_bar += round(self.buildings[building]["env_cost"] + 10**(lv/10), 3)
                tile.status.durability = self.building_stats[building]["max_durability"] + 10**(lv/2)



    def money_env_update(self):
        for tile in self.tiles:
            if isinstance(tile.status, Building):
                building = tile.status
                stats = self.building_stats[building.name]
                # Energy production scales with level
                energy_gain = round(stats["E_prod"] * (1 + building.lv / 2))
                self.energy += energy_gain
                # Environmental cost scales with level
                env_cost = round(stats["env_cost"] * (1 + building.lv / 5),3)
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
