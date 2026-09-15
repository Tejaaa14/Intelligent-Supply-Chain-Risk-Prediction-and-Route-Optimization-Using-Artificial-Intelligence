import os
import json
import asyncio
import datetime
import websockets
from typing import Dict, Any, List, Optional

class AISService:
    def __init__(self):
        self.api_enabled = os.getenv("AIS_ENABLED", "false").lower() == "true"
        self.api_key = os.getenv("AIS_API_KEY", "")
        self.ws_url = "wss://stream.aisstream.io/v0/stream"
        self.data_mode = os.getenv("DATA_MODE", "LIVE").upper()  # LIVE or SIMULATION
        
        self._vessels: Dict[str, Dict[str, Any]] = {}
        self._task: Optional[asyncio.Task] = None
        self._ws: Optional[websockets.WebSocketClientProtocol] = None
        self._connected = False
        self._last_message_time: Optional[str] = None
        self._messages_received = 0
        
        # Default bounding box (South China Sea roughly)
        self.bounding_boxes = [[[10.0, 105.0], [25.0, 125.0]]]

    def get_data_source_mode(self) -> str:
        if self.data_mode == "SIMULATION":
            return "SIMULATION"
        if self.api_enabled and self.api_key:
            return "LIVE"
        elif self.api_enabled:
            return "ERROR"
        return "ERROR"

    def get_connection_status(self) -> str:
        """Return granular connection status."""
        mode = self.get_data_source_mode()
        if mode == "SIMULATION":
            return "SIMULATION"
        if mode == "ERROR":
            return "ERROR"
        if self._connected and len(self._vessels) > 0:
            return "LIVE"
        if self._connected and len(self._vessels) == 0:
            return "CONNECTED_NO_DATA"
        return "DISCONNECTED"

    def start_stream(self):
        if self.get_data_source_mode() == "LIVE":
            if self._task is None or self._task.done():
                self._task = asyncio.create_task(self._listen_to_stream())

    def update_bounding_boxes(self, min_lat: float, max_lat: float, min_lon: float, max_lon: float):
        """Update AIS Stream bounding boxes and reconnect."""
        self.bounding_boxes = [[[min_lat, min_lon], [max_lat, max_lon]]]
        if self._task and not self._task.done():
            self._task.cancel()
        self.start_stream()

    async def _listen_to_stream(self):
        while True:
            try:
                async with websockets.connect(self.ws_url) as websocket:
                    self._ws = websocket
                    self._connected = True
                    subscribe_message = {
                        "APIKey": self.api_key,
                        "BoundingBoxes": self.bounding_boxes,
                        "FiltersShipMMSI": [],
                        "FilterMessageTypes": ["PositionReport", "StandardClassBPositionReport", "ShipStaticData"]
                    }
                    await websocket.send(json.dumps(subscribe_message))
                    print(f"[AISService] Connected & Subscribed to bounds: {self.bounding_boxes}")
                    
                    async for message_json in websocket:
                        try:
                            message = json.loads(message_json)
                            self._process_message(message)
                            self._messages_received += 1
                            self._last_message_time = datetime.datetime.utcnow().isoformat()
                        except Exception as parse_err:
                            pass
            except asyncio.CancelledError:
                print("[AISService] Stream task cancelled (likely updating bounds).")
                self._connected = False
                break
            except Exception as e:
                print(f"[AISService] WebSocket error: {e}. Reconnecting in 5s...")
                self._connected = False
                await asyncio.sleep(5)

    def _process_message(self, message: Dict[str, Any]):
        msg_type = message.get("MessageType")
        if not msg_type:
            return

        msg_data = message.get("Message", {}).get(msg_type, {})
        mmsi = str(message.get("MetaData", {}).get("MMSI", ""))
        
        if not mmsi:
            return

        now = datetime.datetime.utcnow().isoformat()
        
        # Get existing or init new
        vessel = self._vessels.get(mmsi, {
            "vessel_id": f"VSL_{mmsi}",
            "mmsi": mmsi,
            "imo_number": "N/A",
            "vessel_name": message.get("MetaData", {}).get("ShipName", "").strip() or "N/A",
            "latitude": None,
            "longitude": None,
            "speed": None,
            "heading": None,
            "course": None,
            "destination": "N/A",
            "eta": "N/A",
            "navigation_status": "N/A",
            "vessel_type": "N/A",
            "timestamp": now,
            "data_source_mode": "LIVE",
            "source": "AISStream",
            "source_type": "LIVE",
            "retrieved_at": now
        })

        if msg_type in ["PositionReport", "StandardClassBPositionReport"]:
            lat = msg_data.get("Latitude")
            lon = msg_data.get("Longitude")
            sog = msg_data.get("Sog")
            cog = msg_data.get("Cog")
            hdg = msg_data.get("TrueHeading")
            nav_status = msg_data.get("NavigationalStatus")

            if lat is not None and lat != 91.0:
                vessel["latitude"] = round(lat, 4)
            if lon is not None and lon != 181.0:
                vessel["longitude"] = round(lon, 4)
            if sog is not None and sog != 102.3:
                vessel["speed"] = round(sog, 1)
            if cog is not None and cog != 360.0:
                vessel["course"] = round(cog, 1)
            if hdg is not None and hdg != 511:
                vessel["heading"] = hdg
            if nav_status is not None:
                status_map = {
                    0: "UNDERWAY", 1: "AT ANCHOR", 2: "NOT UNDER COMMAND",
                    3: "RESTRICTED MANEUVERABILITY", 4: "CONSTRAINED BY DRAFT",
                    5: "MOORED", 6: "AGROUND", 7: "ENGAGED IN FISHING",
                    8: "UNDERWAY SAILING", 15: "UNKNOWN"
                }
                vessel["navigation_status"] = status_map.get(nav_status, "UNKNOWN")

        elif msg_type == "ShipStaticData":
            imo = msg_data.get("ImoNumber")
            dest = msg_data.get("Destination", "").strip()
            vessel_name = msg_data.get("Name", "").strip()
            
            if imo and imo > 0:
                vessel["imo_number"] = str(imo)
            if dest:
                # Remove @@@@ trailing characters common in AIS
                dest = dest.replace('@', '').strip()
                if dest:
                    vessel["destination"] = dest
            if vessel_name:
                vessel["vessel_name"] = vessel_name.replace('@', '').strip()
            
            # AIS Stream ETA object: {Month, Day, Hour, Minute}
            eta_data = msg_data.get("Eta")
            if eta_data and isinstance(eta_data, dict):
                month = eta_data.get("Month", 0)
                day = eta_data.get("Day", 0)
                hour = eta_data.get("Hour", 0)
                minute = eta_data.get("Minute", 0)
                if 1 <= month <= 12 and 1 <= day <= 31 and hour < 24 and minute < 60:
                    current_year = datetime.datetime.utcnow().year
                    # Simple ETA string construction
                    eta_str = f"{current_year}-{month:02d}-{day:02d}T{hour:02d}:{minute:02d}:00Z"
                    vessel["eta"] = eta_str

        vessel["retrieved_at"] = now
        vessel["timestamp"] = message.get("MetaData", {}).get("time_utc", now)
        
        # Don't overwrite known name with empty if metadata doesn't have it
        ship_name = message.get("MetaData", {}).get("ShipName", "").strip()
        if ship_name and vessel["vessel_name"] == "N/A":
            vessel["vessel_name"] = ship_name

        self._vessels[mmsi] = vessel


    def get_all_vessels(self) -> List[Dict[str, Any]]:
        """Return vessels based on current mode — never silently fake data."""
        mode = self.get_data_source_mode()
        vessels = []
        if mode == "LIVE":
            vessels = list(self._vessels.values())
        elif mode == "SIMULATION":
            vessels = self._get_simulated_vessels()
        
        return vessels

    def get_all_vessels_with_status(self) -> Dict[str, Any]:
        """Return vessels with full metadata about data source and connection."""
        mode = self.get_data_source_mode()
        conn_status = self.get_connection_status()
        vessels = self.get_all_vessels()
        
        return {
            "source_status": conn_status,
            "source_type": "AISSTREAM",
            "data_mode": mode,
            "vessels_received_count": len(vessels),
            "total_messages_processed": self._messages_received,
            "last_message_received": self._last_message_time,
            "bounding_boxes": self.bounding_boxes,
            "message": self._get_status_message(conn_status),
            "vessels": vessels
        }

    def _get_status_message(self, status: str) -> str:
        messages = {
            "LIVE": f"Receiving live AIS data. {len(self._vessels)} vessels tracked.",
            "CONNECTED_NO_DATA": "Connected to AISStream but no vessel messages received yet for this bounding box.",
            "DISCONNECTED": "AISStream WebSocket disconnected. Attempting reconnection.",
            "ERROR": "AIS data unavailable — missing API key or AIS not enabled.",
            "SIMULATION": "Running in SIMULATION mode. Vessels are synthetic demo data, not real AIS broadcasts."
        }
        return messages.get(status, "Unknown status")

    def _get_simulated_vessels(self) -> List[Dict[str, Any]]:
        """Return demo vessels ONLY when DATA_MODE=SIMULATION is explicitly set."""
        now = datetime.datetime.utcnow().isoformat()
        return [
            {
                "vessel_id": "SIM_001", "mmsi": "111111111", "imo_number": "N/A",
                "vessel_name": "Ocean Star (Demo)", "latitude": 17.3850, "longitude": 113.4860,
                "speed": 18.4, "heading": 210, "course": 210,
                "destination": "Singapore", "eta": "N/A", "navigation_status": "UNDERWAY_USING_ENGINE",
                "vessel_type": "Container Ship", "timestamp": now,
                "data_source_mode": "SIMULATION", "source": "SimulationEngine",
                "source_type": "SIMULATION", "retrieved_at": now
            }
        ]

    def get_vessel(self, vessel_id: str) -> Optional[Dict[str, Any]]:
        for v in self.get_all_vessels():
            if v["vessel_id"] == vessel_id:
                return v
        return None

ais_service_instance = AISService()


