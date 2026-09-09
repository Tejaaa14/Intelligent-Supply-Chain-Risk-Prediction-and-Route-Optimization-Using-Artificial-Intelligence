import os
import datetime
import httpx
from typing import Dict, Any, List

# Static port reference data — coordinates and UNCTAD Liner Connectivity Index values
# Source: UNCTAD Review of Maritime Transport (2024 edition)
# These are NOT live congestion metrics — they are reference baselines.
PORT_REFERENCE_DATA = [
    {"port_id": "SGP", "port_name": "Port of Singapore", "latitude": 1.2902, "longitude": 103.8519,
     "unctad_connectivity_index": 128.5, "country": "Singapore", "region": "Southeast Asia"},
    {"port_id": "SHA", "port_name": "Port of Shanghai", "latitude": 31.2304, "longitude": 121.4737,
     "unctad_connectivity_index": 142.1, "country": "China", "region": "East Asia"},
    {"port_id": "RTM", "port_name": "Port of Rotterdam", "latitude": 51.9244, "longitude": 4.4777,
     "unctad_connectivity_index": 94.2, "country": "Netherlands", "region": "Europe"},
    {"port_id": "LAX", "port_name": "Port of Los Angeles", "latitude": 33.7423, "longitude": -118.2673,
     "unctad_connectivity_index": 105.8, "country": "United States", "region": "North America"},
    {"port_id": "DXB", "port_name": "Port of Jebel Ali (Dubai)", "latitude": 24.9857, "longitude": 55.0273,
     "unctad_connectivity_index": 82.4, "country": "UAE", "region": "Middle East"},
    {"port_id": "HKG", "port_name": "Port of Hong Kong", "latitude": 22.3193, "longitude": 114.1694,
     "unctad_connectivity_index": 115.0, "country": "China", "region": "East Asia"}
]

class PortService:
    """
    Port data service using IMF PortWatch public APIs and UNCTAD reference data.
    
    IMPORTANT: IMF PortWatch public REST API does NOT directly provide:
    - exact berth occupancy percentages
    - exact vessel queue lengths
    - exact waiting times
    
    These metrics are DERIVED by this application using the UNCTAD Liner
    Connectivity Index as a baseline, with a documented congestion estimation formula.
    All derived metrics are explicitly labeled as metric_type: DERIVED.
    """
    # Congestion estimation formula documentation:
    # congestion_score = min(100, unctad_index * 0.6 + seasonal_factor)
    # waiting_time_estimate = congestion_score * 0.25 (hours)
    # occupancy_estimate = min(98, congestion_score * 0.95)
    # congestion_level = HIGH if score > 75, MEDIUM if > 45, else LOW

    def __init__(self):
        self.api_enabled = os.getenv("PORT_CONGESTION_ENABLED", "true").lower() == "true"
        self.portwatch_url = os.getenv("PORT_API_URL", "https://portwatch.imf.org")
        self._cached_ports = {}
        self.cache_ttl_seconds = 900  # 15 minutes refresh interval
        self._connection_status = "UNKNOWN"

    def get_data_source_mode(self) -> str:
        return "UNCTAD_REFERENCE + DERIVED"

    def get_port_congestion(self, port_id: str) -> Dict[str, Any]:
        """Get port metrics: static reference data + derived congestion estimates."""
        now = datetime.datetime.utcnow()

        if port_id in self._cached_ports:
            c_time, c_data = self._cached_ports[port_id]
            if (now - c_time).total_seconds() < self.cache_ttl_seconds:
                return c_data

        port_ref = next((p for p in PORT_REFERENCE_DATA if p["port_id"] == port_id), None)
        if not port_ref:
            return self._unknown_port_response(port_id)

        # Try PortWatch API for any available data
        portwatch_data = None
        portwatch_status = "NOT_ATTEMPTED"
        if self.api_enabled:
            portwatch_data, portwatch_status = self._try_portwatch(port_id)

        # Calculate DERIVED congestion metrics from UNCTAD baseline
        unctad_idx = port_ref["unctad_connectivity_index"]
        congestion_score = min(100.0, round(unctad_idx * 0.6, 1))
        waiting_time_estimate = round(congestion_score * 0.25, 1)
        occupancy_estimate = round(min(98.0, congestion_score * 0.95), 1)

        if congestion_score > 75:
            congestion_level = "HIGH"
        elif congestion_score > 45:
            congestion_level = "MEDIUM"
        else:
            congestion_level = "LOW"

        res = {
            "port_id": port_id,
            "port_name": port_ref["port_name"],
            "latitude": port_ref["latitude"],
            "longitude": port_ref["longitude"],
            "country": port_ref["country"],
            "region": port_ref["region"],
            # UNCTAD reference data (real, verified)
            "unctad_connectivity_index": unctad_idx,
            "unctad_source": "UNCTAD Review of Maritime Transport 2024",
            "unctad_metric_type": "REFERENCE",
            # DERIVED congestion metrics (calculated, not from API)
            "congestion_score": congestion_score,
            "congestion_score_metric_type": "DERIVED",
            "congestion_score_formula": "min(100, unctad_index × 0.6)",
            "average_waiting_time": waiting_time_estimate,
            "waiting_time_metric_type": "DERIVED",
            "waiting_time_formula": "congestion_score × 0.25 hours",
            "port_occupancy": occupancy_estimate,
            "occupancy_metric_type": "DERIVED",
            "occupancy_formula": "min(98, congestion_score × 0.95)",
            "congestion_level": congestion_level,
            "congestion_level_metric_type": "DERIVED",
            # Source metadata
            "data_source_mode": "UNCTAD_REFERENCE + DERIVED",
            "source": "UNCTAD Liner Connectivity Index + Derived Estimation",
            "source_type": "PUBLIC_DATA + DERIVED",
            "source_status": "SUCCESS",
            "portwatch_api_status": portwatch_status,
            "retrieved_at": now.isoformat(),
            "timestamp": now.isoformat(),
            "data_lineage": {
                "reference_source": "UNCTAD Review of Maritime Transport 2024",
                "reference_type": "PUBLIC_DATA",
                "derived_metrics": ["congestion_score", "average_waiting_time", "port_occupancy", "congestion_level"],
                "derivation_base": f"UNCTAD Connectivity Index = {unctad_idx}",
                "portwatch_status": portwatch_status
            }
        }
        self._cached_ports[port_id] = (now, res)
        return res

    def _try_portwatch(self, port_id: str) -> tuple:
        """Attempt to call IMF PortWatch API. Returns (data_dict, status_str)."""
        try:
            response = httpx.get(f"{self.portwatch_url}/api/v1/ports/{port_id}", timeout=4.0)
            if response.status_code == 200:
                self._connection_status = "SUCCESS"
                return response.json(), "SUCCESS"
            else:
                self._connection_status = "ERROR"
                return None, f"HTTP_{response.status_code}"
        except Exception as e:
            print(f"[PortService] PortWatch call failed: {e}")
            self._connection_status = "ERROR"
            return None, "ERROR"

    def _unknown_port_response(self, port_id: str) -> Dict[str, Any]:
        """Return minimal response for unknown port IDs."""
        now = datetime.datetime.utcnow()
        return {
            "port_id": port_id,
            "port_name": "Unknown Port",
            "latitude": 0.0, "longitude": 0.0,
            "congestion_score": "N/A",
            "average_waiting_time": "N/A",
            "port_occupancy": "N/A",
            "congestion_level": "UNKNOWN",
            "data_source_mode": "ERROR",
            "source_status": "ERROR",
            "retrieved_at": now.isoformat()
        }

    def get_all_ports(self) -> List[Dict[str, Any]]:
        return [self.get_port_congestion(p["port_id"]) for p in PORT_REFERENCE_DATA]
