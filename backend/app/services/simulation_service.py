import datetime
from sqlalchemy.orm import Session
from app.database import crud, models
from app.services.ais_service import AISService
from app.services.weather_service import WeatherService
from app.services.port_service import PortService
from app.services.fuel_service import FuelService
from app.services.news_service import NewsService

# Pre-defined realistic maritime waypoints for simulation vessels
ROUTE_WAYPOINTS = {
    "Ocean Star": [
        {"lat": 31.2304, "lon": 121.4737, "name": "Shanghai Port"},
        {"lat": 24.4798, "lon": 118.0894, "name": "Taiwan Strait"},
        {"lat": 18.5000, "lon": 115.2000, "name": "South China Sea Central"},
        {"lat": 10.0000, "lon": 110.0000, "name": "South China Sea South"},
        {"lat": 1.2902, "lon": 103.8519, "name": "Singapore Port"}
    ],
    "Pacific Voyager": [
        {"lat": 33.7423, "lon": -118.2673, "name": "Los Angeles"},
        {"lat": 25.0000, "lon": -140.0000, "name": "Mid Pacific North"},
        {"lat": 20.0000, "lon": 140.0000, "name": "Philippine Sea"},
        {"lat": 22.3193, "lon": 114.1694, "name": "Hong Kong"}
    ],
    "Nordic Merchant": [
        {"lat": 51.9244, "lon": 4.4777, "name": "Rotterdam"},
        {"lat": 36.0000, "lon": -5.0000, "name": "Strait of Gibraltar"},
        {"lat": 30.5852, "lon": 32.2654, "name": "Suez Canal"},
        {"lat": 24.9857, "lon": 55.0273, "name": "Dubai Jebel Ali"}
    ]
}

class SimulationEngine:
    def __init__(self):
        self.ais_service = AISService()
        self.weather_service = WeatherService()
        self.port_service = PortService()
        self.fuel_service = FuelService()
        self.news_service = NewsService()

    def _calculate_bearing(self, lat1: float, lon1: float, lat2: float, lon2: float) -> int:
        import math
        dLon = math.radians(lon2 - lon1)
        lat1 = math.radians(lat1)
        lat2 = math.radians(lat2)
        y = math.sin(dLon) * math.cos(lat2)
        x = math.cos(lat1) * math.sin(lat2) - math.sin(lat1) * math.cos(lat2) * math.cos(dLon)
        brng = math.atan2(y, x)
        return int((math.degrees(brng) + 360) % 360)

    def _move_towards(self, curr_lat: float, curr_lon: float, target_lat: float, target_lon: float, speed_knots: float, delta_hours: float):
        import math
        distance_nm = speed_knots * delta_hours
        lat_diff = target_lat - curr_lat
        lon_diff = target_lon - curr_lon
        
        # Approximate 1 deg lat = 60 nm, 1 deg lon = 60 nm * cos(lat)
        dist_deg = distance_nm / 60.0
        
        total_dist_deg = (lat_diff**2 + lon_diff**2)**0.5
        if total_dist_deg <= dist_deg:
            return target_lat, target_lon, True
            
        ratio = dist_deg / total_dist_deg
        new_lat = curr_lat + lat_diff * ratio
        new_lon = curr_lon + lon_diff * ratio
        return new_lat, new_lon, False

    def run_simulation_tick(self, db: Session):
        """Execute periodic update across vessels, ports, weather, fuel prices, and news."""
        print("[SimulationEngine] Executing simulation tick...")
        
        # 1. Update Vessels positions along waypoints
        vessels = db.query(models.Vessel).all()
        for vessel in vessels:
            waypoints = ROUTE_WAYPOINTS.get(vessel.vessel_name, ROUTE_WAYPOINTS["Ocean Star"])
            
            # Find closest target waypoint
            curr_lat = vessel.current_latitude or waypoints[0]["lat"]
            curr_lon = vessel.current_longitude or waypoints[0]["lon"]

            target_idx = 1
            for idx, wp in enumerate(waypoints):
                d = ((wp["lat"] - curr_lat)**2 + (wp["lon"] - curr_lon)**2)**0.5
                if d < 0.2 and idx < len(waypoints) - 1:
                    target_idx = idx + 1
                    break
            
            target = waypoints[min(target_idx, len(waypoints) - 1)]
            
            # Step vessel forward
            new_lat, new_lon, reached = self._move_towards(
                curr_lat, curr_lon, target["lat"], target["lon"], vessel.speed or 18.0, delta_hours=0.1
            )
            
            heading = self._calculate_bearing(curr_lat, curr_lon, new_lat, new_lon)

            # Update Vessel record
            vessel.current_latitude = new_lat
            vessel.current_longitude = new_lon
            vessel.heading = heading
            vessel.course = heading
            vessel.updated_at = datetime.datetime.utcnow()

            crud.add_vessel_position(db, vessel.vessel_id, new_lat, new_lon, vessel.speed, heading)

            # Fetch live/simulated weather for vessel position
            w_data = self.weather_service.get_weather_for_location(new_lat, new_lon, f"Near {vessel.vessel_name}")
            crud.save_weather(db, w_data)

        # 2. Update Ports status
        for port_info in self.port_service.get_all_ports():
            crud.create_or_update_port(db, port_info)

        # 3. Update Fuel Prices
        for f_info in self.fuel_service.get_all_regional_prices():
            existing = db.query(models.FuelPrice).filter(models.FuelPrice.region == f_info["region"]).first()
            price_val = f_info.get("price", f_info.get("price_per_mt", 630.0))
            if not existing:
                db.add(models.FuelPrice(
                    region=f_info["region"],
                    fuel_type=f_info.get("fuel_type", "VLSFO"),
                    price_per_mt=price_val,
                    currency=f_info.get("currency", "USD"),
                    source=f_info.get("source", "EIA Benchmark"),
                    data_source_mode=f_info.get("data_source_mode", "PUBLIC DATA")
                ))
            else:
                existing.price_per_mt = price_val
                existing.updated_at = datetime.datetime.utcnow()

        db.commit()
        print("[SimulationEngine] Simulation tick complete.")
