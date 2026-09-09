from typing import Dict, Any
import datetime
import uuid

class ScenarioService:
    """
    Manages the 'LIVE + SCENARIO' Digital Twin state.
    Base real-world API data remains intact. Scenarios apply multiplicative
    or additive disruptions onto the base values before predictions/optimizations.
    """
    def __init__(self):
        self._active_disruptions = {
            "weather_bonus": 0.0,
            "congestion_bonus": 0.0,
            "geo_bonus": 0.0,
            "fuel_price_bonus": 0.0
        }
        self._current_scenario_name = "None (Live Data Only)"

    def apply_scenario(self, name: str, params: Dict[str, float]) -> Dict[str, Any]:
        """Apply a simulated disruption over the live state."""
        self._current_scenario_name = name
        
        # Reset and apply new
        self._active_disruptions = {
            "weather_bonus": params.get("weather_bonus", 0.0),
            "congestion_bonus": params.get("congestion_bonus", 0.0),
            "geo_bonus": params.get("geo_bonus", 0.0),
            "fuel_price_bonus": params.get("fuel_price_bonus", 0.0)
        }
        
        return {
            "scenario": self._current_scenario_name,
            "active_disruptions": self._active_disruptions,
            "timestamp": datetime.datetime.utcnow().isoformat()
        }
        
    def clear_scenarios(self):
        self._current_scenario_name = "None (Live Data Only)"
        self._active_disruptions = {
            "weather_bonus": 0.0,
            "congestion_bonus": 0.0,
            "geo_bonus": 0.0,
            "fuel_price_bonus": 0.0
        }

    def get_current_disruptions(self) -> Dict[str, float]:
        return self._active_disruptions
        
    def get_status(self) -> Dict[str, Any]:
        return {
            "active_scenario": self._current_scenario_name,
            "disruptions": self._active_disruptions,
            "is_active": self._current_scenario_name != "None (Live Data Only)"
        }

scenario_service_instance = ScenarioService()
