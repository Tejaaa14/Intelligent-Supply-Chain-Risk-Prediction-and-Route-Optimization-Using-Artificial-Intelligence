import networkx as nx
from typing import Dict, Any, List

class MaritimeGraphNetwork:
    def __init__(self):
        self.graph = nx.DiGraph()
        self._build_maritime_network()

    def _build_maritime_network(self):
        """Construct maritime graph with nodes (ports/straits) and edge characteristics."""
        # Add Port / Passage Nodes
        nodes = {
            "SHA": {"name": "Shanghai Port", "lat": 31.2304, "lon": 121.4737},
            "TWS": {"name": "Taiwan Strait", "lat": 24.4798, "lon": 118.0894},
            "SCS_N": {"name": "South China Sea North", "lat": 20.0000, "lon": 116.0000},
            "SCS_S": {"name": "South China Sea South", "lat": 10.0000, "lon": 110.0000},
            "MLS": {"name": "Malacca Strait", "lat": 2.5000, "lon": 101.5000},
            "SGP": {"name": "Singapore Port", "lat": 1.2902, "lon": 103.8519},
            "LOK": {"name": "Lombok Strait (Outer Bypass)", "lat": -8.5000, "lon": 115.7000},
            "SDA": {"name": "Sunda Strait Bypass", "lat": -5.9000, "lon": 105.7000},
            "HKG": {"name": "Hong Kong Port", "lat": 22.3193, "lon": 114.1694},
            "RTM": {"name": "Rotterdam Port", "lat": 51.9244, "lon": 4.4777},
            "LAX": {"name": "Los Angeles Port", "lat": 33.7423, "lon": -118.2673},
            "DXB": {"name": "Jebel Ali Dubai", "lat": 24.9857, "lon": 55.0273},
            "SUEZ": {"name": "Suez Canal", "lat": 30.5852, "lon": 32.2654},
            "BAB": {"name": "Bab-el-Mandeb Strait", "lat": 12.5833, "lon": 43.3333},
            "BOM": {"name": "Mumbai JNPT", "lat": 18.9440, "lon": 72.9515},
            "CMB": {"name": "Colombo Port", "lat": 6.9450, "lon": 79.8450},
            "MAA": {"name": "Chennai Port", "lat": 13.0850, "lon": 80.2980},
            "CCU": {"name": "Kolkata Port", "lat": 22.5448, "lon": 88.3180}
        }
        for node_id, data in nodes.items():
            self.graph.add_node(node_id, **data)

        # Add Maritime Shipping Edges (dist, hrs, w_risk, c_risk, g_risk, waypoints)
        edges = [
            ("SHA", "TWS", 450, 25.0, 35.0, 40.0, 15.0, []),
            ("TWS", "SCS_N", 350, 19.4, 45.0, 30.0, 20.0, []),
            ("SCS_N", "SCS_S", 620, 34.4, 75.0, 20.0, 80.0, []),
            ("SCS_S", "MLS", 480, 26.6, 50.0, 85.0, 25.0, [{"lat": 5.0, "lon": 105.0}]),  # Around Malaysia
            ("MLS", "SGP", 180, 10.0, 20.0, 90.0, 10.0, []),
            
            # Alternative Route B via Lombok Bypass
            ("TWS", "HKG", 300, 16.6, 25.0, 45.0, 10.0, []),
            ("HKG", "LOK", 1150, 63.8, 20.0, 15.0, 15.0, [{"lat": 10.0, "lon": 118.0}]), # Philippines bypass
            ("LOK", "SDA", 580, 32.2, 15.0, 10.0, 10.0, [{"lat": -10.0, "lon": 110.0}]), # South of Java
            ("SDA", "SGP", 520, 28.8, 15.0, 25.0, 10.0, [{"lat": -3.0, "lon": 107.0}]),
            
            # Long distance trans-oceanic legs
            ("SHA", "LAX", 5700, 316.0, 30.0, 50.0, 10.0, [{"lat": 40.0, "lon": 180.0}]), # Great circle approximate
            ("SGP", "DXB", 3400, 188.0, 25.0, 30.0, 20.0, [
                {"lat": 5.5, "lon": 95.0}, # Top of Sumatra
                {"lat": 5.5, "lon": 80.0}, # South of Sri Lanka
                {"lat": 15.0, "lon": 65.0} # Arabian Sea
            ]),
            ("DXB", "BAB", 1200, 66.0, 20.0, 35.0, 85.0, [
                {"lat": 26.0, "lon": 56.5}, # Strait of Hormuz
                {"lat": 22.0, "lon": 60.0}, # Gulf of Oman
                {"lat": 14.0, "lon": 53.0}  # Gulf of Aden
            ]),
            ("BAB", "SUEZ", 1300, 72.0, 15.0, 60.0, 75.0, [{"lat": 20.0, "lon": 39.0}]), # Red sea
            ("SUEZ", "RTM", 3300, 183.0, 40.0, 50.0, 15.0, [
                {"lat": 35.0, "lon": 20.0}, # Mediterranean
                {"lat": 36.0, "lon": -5.0}, # Gibraltar
                {"lat": 45.0, "lon": -8.0}  # Bay of Biscay
            ]),

            # Indian Ocean & Bay of Bengal Connectors
            ("BOM", "DXB", 1050, 58.0, 15.0, 20.0, 25.0, [{"lat": 21.0, "lon": 65.0}]),
            ("BOM", "CMB", 850, 47.0, 25.0, 10.0, 10.0, [{"lat": 12.0, "lon": 74.0}]), # Coast of India
            ("CMB", "BAB", 2100, 116.0, 25.0, 15.0, 65.0, [{"lat": 8.0, "lon": 60.0}]),
            ("CMB", "MLS", 1450, 80.0, 30.0, 15.0, 10.0, [{"lat": 6.0, "lon": 95.0}]),
            ("MAA", "MLS", 1300, 72.0, 35.0, 10.0, 10.0, [{"lat": 10.0, "lon": 90.0}]),
            ("CCU", "MLS", 1550, 86.0, 45.0, 10.0, 10.0, [{"lat": 15.0, "lon": 92.0}])
        ]

        for u, v, dist, hrs, w_risk, c_risk, g_risk, waypoints in edges:
            self.graph.add_edge(u, v, distance=dist, base_hours=hrs, weather_risk=w_risk, congestion_risk=c_risk, geo_risk=g_risk, waypoints=waypoints)
            # Reverse waypoints for bidirectional
            self.graph.add_edge(v, u, distance=dist, base_hours=hrs, weather_risk=w_risk, congestion_risk=c_risk, geo_risk=g_risk, waypoints=list(reversed(waypoints)))



    def get_graph(self) -> nx.DiGraph:
        return self.graph
