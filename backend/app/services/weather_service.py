import os
import datetime
import httpx
from typing import Dict, Any

class WeatherService:
    def __init__(self):
        self.api_enabled = os.getenv("WEATHER_ENABLED", "true").lower() == "true"
        self.forecast_url = os.getenv("WEATHER_API_URL", "https://api.open-meteo.com/v1/forecast")
        self.marine_url = "https://marine-api.open-meteo.com/v1/marine"
        self._cache = {}  # In-memory cache key: (lat, lon) -> (timestamp, data)
        self.cache_ttl_seconds = 300  # 5 minutes refresh interval

    def get_data_source_mode(self) -> str:
        return "LIVE" if self.api_enabled else "ERROR"

    def get_weather_for_location(self, lat: float, lon: float, location_name: str = "Maritime Point") -> Dict[str, Any]:
        """Fetch live weather from Open-Meteo forecast + marine endpoints with 5-min caching."""
        cache_key = (round(lat, 2), round(lon, 2))
        now = datetime.datetime.utcnow()

        # Check cache first to avoid unneeded API calls
        if cache_key in self._cache:
            cached_time, cached_data = self._cache[cache_key]
            if (now - cached_time).total_seconds() < self.cache_ttl_seconds:
                return cached_data

        if not self.api_enabled:
            return self._error_response(lat, lon, location_name, "Weather API not enabled")

        # Fetch atmospheric data from forecast endpoint
        atmo_data = self._fetch_atmosphere(lat, lon)
        # Fetch marine data from marine endpoint
        marine_data = self._fetch_marine(lat, lon)

        if atmo_data is None and marine_data is None:
            return self._error_response(lat, lon, location_name, "Both Open-Meteo endpoints failed")

        # Build result from actual API values
        wind_speed_kmh = 0.0
        wind_direction = 0.0
        temperature = "N/A"
        precipitation = 0.0
        weather_code = 0
        atmo_source_status = "ERROR"

        if atmo_data:
            current = atmo_data.get("current", {})
            wind_speed_kmh = current.get("wind_speed_10m", 0.0)
            wind_direction = current.get("wind_direction_10m", 0.0)
            temperature = current.get("temperature_2m", "N/A")
            precipitation = current.get("precipitation", 0.0)
            weather_code = current.get("weather_code", 0)
            atmo_source_status = "SUCCESS"

        wind_knots = round(wind_speed_kmh * 0.539957, 1)

        # Marine data — wave height, period, direction from actual marine API
        wave_height = None
        wave_direction = None
        wave_period = None
        ocean_current_velocity = None
        ocean_current_direction = None
        marine_source_status = "ERROR"

        if marine_data:
            current_marine = marine_data.get("current", {})
            wave_height = current_marine.get("wave_height")
            wave_direction = current_marine.get("wave_direction")
            wave_period = current_marine.get("wave_period")
            ocean_current_velocity = current_marine.get("ocean_current_velocity")
            ocean_current_direction = current_marine.get("ocean_current_direction")
            marine_source_status = "SUCCESS"

        # If marine endpoint didn't return wave_height, derive from wind (labeled DERIVED)
        wave_height_source = "Open-Meteo Marine API"
        if wave_height is None:
            wave_height = round(0.1 + (wind_knots ** 1.3) * 0.05, 1) if wind_knots > 0 else 0.0
            wave_height_source = "DERIVED from wind_speed (Beaufort approximation)"

        # Determine storm condition from weather code
        storm_condition = "CLEAR"
        if weather_code >= 95:
            storm_condition = "SEVERE_STORM"
        elif weather_code >= 80:
            storm_condition = "MODERATE_STORM"
        elif precipitation > 2.0:
            storm_condition = "MODERATE_RAIN"

        # Visibility estimate (DERIVED — Open-Meteo forecast doesn't provide visibility directly)
        visibility = round(max(1.0, 15.0 - precipitation * 2.0 - (wind_knots * 0.1)), 1)

        # Calculate weather risk from actual values
        weather_risk = self.calculate_weather_risk(wind_knots, wave_height, visibility, storm_condition)

        # Determine weather risk level
        if weather_risk >= 75:
            weather_risk_level = "CRITICAL"
        elif weather_risk >= 50:
            weather_risk_level = "HIGH"
        elif weather_risk >= 25:
            weather_risk_level = "MEDIUM"
        else:
            weather_risk_level = "LOW"

        result = {
            "location_name": location_name,
            "latitude": lat,
            "longitude": lon,
            "temperature": temperature,
            "wind_speed": wind_knots,
            "wind_direction": wind_direction,
            "precipitation": precipitation,
            "visibility": visibility,
            "visibility_source": "DERIVED from precipitation and wind",
            "wave_height": wave_height,
            "wave_height_source": wave_height_source,
            "wave_direction": wave_direction,
            "wave_period": wave_period,
            "ocean_current_velocity": ocean_current_velocity,
            "ocean_current_direction": ocean_current_direction,
            "storm_condition": storm_condition,
            "weather_code": weather_code,
            "weather_risk_score": weather_risk,
            "weather_risk_level": weather_risk_level,
            "data_source_mode": "LIVE",
            "source": "Open-Meteo",
            "source_type": "LIVE",
            "retrieved_at": now.isoformat(),
            "timestamp": now.isoformat(),
            "data_lineage": {
                "atmospheric": {
                    "source": "Open-Meteo Forecast API",
                    "endpoint": "/v1/forecast",
                    "status": atmo_source_status,
                    "variables": ["temperature_2m", "wind_speed_10m", "wind_direction_10m", "precipitation", "weather_code"]
                },
                "marine": {
                    "source": "Open-Meteo Marine API",
                    "endpoint": "/v1/marine",
                    "status": marine_source_status,
                    "variables": ["wave_height", "wave_direction", "wave_period", "ocean_current_velocity", "ocean_current_direction"]
                },
                "derived_fields": ["visibility", "weather_risk_score", "weather_risk_level", "storm_condition"],
                "coordinates_used": {"lat": lat, "lon": lon}
            }
        }
        self._cache[cache_key] = (now, result)
        return result

    def _fetch_atmosphere(self, lat: float, lon: float) -> dict:
        """Fetch atmospheric data from Open-Meteo forecast endpoint."""
        try:
            params = {
                "latitude": lat,
                "longitude": lon,
                "current": ["temperature_2m", "wind_speed_10m", "wind_direction_10m", "precipitation", "weather_code"]
            }
            response = httpx.get(self.forecast_url, params=params, timeout=4.0)
            if response.status_code == 200:
                return response.json()
        except Exception as e:
            print(f"[WeatherService] Forecast API call failed: {e}")
        return None

    def _fetch_marine(self, lat: float, lon: float) -> dict:
        """Fetch marine data from Open-Meteo marine endpoint."""
        try:
            params = {
                "latitude": lat,
                "longitude": lon,
                "current": ["wave_height", "wave_direction", "wave_period"]
            }
            response = httpx.get(self.marine_url, params=params, timeout=4.0)
            if response.status_code == 200:
                return response.json()
        except Exception as e:
            print(f"[WeatherService] Marine API call failed: {e}")
        return None

    def _error_response(self, lat: float, lon: float, location_name: str, reason: str) -> Dict[str, Any]:
        """Return ERROR state when API is unavailable — no fake data."""
        now = datetime.datetime.utcnow()
        return {
            "location_name": location_name,
            "latitude": lat,
            "longitude": lon,
            "temperature": "N/A",
            "wind_speed": "N/A",
            "wind_direction": "N/A",
            "precipitation": "N/A",
            "visibility": "N/A",
            "wave_height": "N/A",
            "wave_height_source": "N/A",
            "storm_condition": "UNAVAILABLE",
            "weather_code": "N/A",
            "weather_risk_score": "N/A",
            "weather_risk_level": "UNAVAILABLE",
            "data_source_mode": "ERROR",
            "source": "Open-Meteo Unavailable",
            "source_type": "ERROR",
            "retrieved_at": now.isoformat(),
            "timestamp": now.isoformat(),
            "error_reason": reason,
            "data_lineage": {
                "atmospheric": {"status": "ERROR"},
                "marine": {"status": "ERROR"},
                "derived_fields": [],
                "coordinates_used": {"lat": lat, "lon": lon}
            }
        }

    @staticmethod
    def calculate_weather_risk(wind_knots: float, wave_height: float, visibility_km: float, storm_condition: str) -> float:
        """Documented risk calculation:
        - Wind contributes up to 40% (linear scale to 50 knots)
        - Wave height contributes up to 35% (linear scale to 8m)
        - Reduced visibility contributes up to 15% (1.5 per km below 10km)
        - Storm condition adds bonus: SEVERE_STORM=+25, MODERATE_STORM=+15, MODERATE_RAIN=+5
        """
        score = 0.0
        score += min(40.0, (wind_knots / 50.0) * 40.0)
        score += min(35.0, (wave_height / 8.0) * 35.0)
        score += max(0.0, (10.0 - visibility_km) * 1.5)
        if storm_condition in ["SEVERE_STORM"]:
            score += 25.0
        elif storm_condition == "MODERATE_STORM":
            score += 15.0
        elif storm_condition == "MODERATE_RAIN":
            score += 5.0
        return round(min(100.0, score), 1)
