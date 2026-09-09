import re
import math
from typing import Dict, Any, List, Optional

EVENT_KEYWORDS = {
    "WAR": ["war", "military conflict", "missile", "naval warfare", "armed forces"],
    "CONFLICT": ["conflict", "tensions", "hostilities", "attack", "drone strike"],
    "STRIKE": ["strike", "labor dispute", "union", "walkout", "picket", "dockworker strike"],
    "SANCTION": ["sanction", "trade restriction", "embargo", "export control"],
    "PORT_CLOSURE": ["port closure", "terminal shutdown", "quarantine", "berth closed"],
    "BLOCKADE": ["blockade", "canal blockage", "straits closed", "maritime barrier"],
    "STORM": ["typhoon", "hurricane", "cyclone", "severe storm", "gale", "rough seas"],
    "EARTHQUAKE": ["earthquake", "tsunami", "seismic"],
    "POLITICAL_UNREST": ["protest", "unrest", "riot", "political turmoil"],
    "ECONOMIC_EVENT": ["tariff", "cost increase", "inflation", "fuel price hike", "toll fee"],
    "OTHER": []
}

GEOGRAPHIC_MAP = {
    "shanghai": {"location": "Port of Shanghai", "country": "China", "lat": 31.2304, "lon": 121.4737},
    "singapore": {"location": "Port of Singapore", "country": "Singapore", "lat": 1.2902, "lon": 103.8519},
    "taiwan": {"location": "Taiwan Strait", "country": "Taiwan", "lat": 24.4798, "lon": 118.0894},
    "red sea": {"location": "Red Sea Transit", "country": "Yemen/Egypt", "lat": 20.0000, "lon": 38.0000},
    "suez": {"location": "Suez Canal", "country": "Egypt", "lat": 30.5852, "lon": 32.2654},
    "rotterdam": {"location": "Port of Rotterdam", "country": "Netherlands", "lat": 51.9244, "lon": 4.4777},
    "malacca": {"location": "Strait of Malacca", "country": "Malaysia/Indonesia", "lat": 2.5000, "lon": 101.5000},
    "hong kong": {"location": "Port of Hong Kong", "country": "China", "lat": 22.3193, "lon": 114.1694},
    "los angeles": {"location": "Port of Los Angeles", "country": "United States", "lat": 33.7423, "lon": -118.2673},
    "dubai": {"location": "Port of Jebel Ali", "country": "UAE", "lat": 24.9857, "lon": 55.0273},
    "panama": {"location": "Panama Canal", "country": "Panama", "lat": 9.0800, "lon": -79.6800},
    "hormuz": {"location": "Strait of Hormuz", "country": "Iran/Oman", "lat": 26.5667, "lon": 56.2500}
}

# Supply chain relevance keywords
SUPPLY_CHAIN_KEYWORDS = [
    "shipping", "maritime", "port", "cargo", "vessel", "container", "freight",
    "supply chain", "logistics", "tanker", "bulk carrier", "trade route",
    "strait", "canal", "customs", "dock", "berth", "terminal", "harbor"
]

class GeopoliticalNLPPipeline:
    """
    NLP pipeline for processing geopolitical news articles.
    
    Pipeline stages:
    1. Text Cleaning — remove special characters
    2. Tokenization — split into word tokens
    3. Entity Extraction — geographic location matching
    4. Event Classification — keyword-based event type identification
    5. Sentiment Analysis — positive/negative word ratio
    6. Severity Estimation — base risk from event type + sentiment adjustment
    7. Geographic Relevance — proximity to shipping corridors
    8. Supply Chain Relevance — keyword matching for maritime terms
    9. Geopolitical Risk Score — composite score
    """

    def process_text(self, headline: str, description: str = "") -> Dict[str, Any]:
        full_text = f"{headline} {description}".lower()
        cleaned_text = re.sub(r"[^\w\s]", " ", full_text)
        tokens = cleaned_text.split()

        # 1. Classify Event Type
        matched_event = "OTHER"
        highest_score = 0
        for event_type, kw_list in EVENT_KEYWORDS.items():
            if event_type == "OTHER":
                continue
            score = sum(1 for kw in kw_list if kw in full_text)
            if score > highest_score:
                highest_score = score
                matched_event = event_type

        # 2. Extract Geographic Entities
        geo_info = {"location": "Global Waterway", "country": "International", "lat": 0.0, "lon": 0.0}
        for key, info in GEOGRAPHIC_MAP.items():
            if key in full_text:
                geo_info = info
                break

        # 3. Sentiment & Risk Score Calculation
        negative_words = ["strike", "closure", "delay", "threat", "risk", "hazard", "shutdown",
                          "attack", "storm", "blockade", "disruption", "crisis", "warning", "danger"]
        positive_words = ["expansion", "efficiency", "growth", "resolution", "safe", "smooth",
                          "resumed", "recovery", "improvement", "stable"]
        
        neg_count = sum(1 for w in negative_words if w in tokens)
        pos_count = sum(1 for w in positive_words if w in tokens)

        sentiment = round((pos_count - neg_count) / max(1, pos_count + neg_count), 2)
        
        base_risk_map = {
            "WAR": 95.0, "BLOCKADE": 90.0, "STORM": 85.0, "STRIKE": 80.0,
            "PORT_CLOSURE": 85.0, "CONFLICT": 75.0, "SANCTION": 60.0,
            "EARTHQUAKE": 80.0, "POLITICAL_UNREST": 50.0, "ECONOMIC_EVENT": 30.0,
            "OTHER": 15.0
        }

        risk_score = round(min(100.0, base_risk_map.get(matched_event, 15.0) + neg_count * 5.0), 1)

        # 4. Severity Level
        if risk_score >= 80:
            severity_level = "CRITICAL"
        elif risk_score >= 60:
            severity_level = "HIGH"
        elif risk_score >= 35:
            severity_level = "MEDIUM"
        else:
            severity_level = "LOW"

        # 5. Supply Chain Relevance Score
        sc_matches = sum(1 for kw in SUPPLY_CHAIN_KEYWORDS if kw in full_text)
        supply_chain_relevance = round(min(100.0, sc_matches * 15.0), 1)

        return {
            "headline": headline,
            "event_type": matched_event,
            "severity_level": severity_level,
            "location": geo_info["location"],
            "country": geo_info["country"],
            "latitude": geo_info["lat"],
            "longitude": geo_info["lon"],
            "sentiment": sentiment,
            "risk_score": risk_score,
            "supply_chain_relevance": supply_chain_relevance,
            "extracted_keywords": [w for w in tokens if len(w) > 4][:8],
            "pipeline_steps": [
                "text_cleaning", "tokenization", "entity_extraction",
                "event_classification", "sentiment_analysis", "severity_estimation",
                "geographic_relevance", "supply_chain_relevance"
            ]
        }

    def calculate_geographic_relevance(self, event_lat: float, event_lon: float,
                                        route_points: List[Dict[str, float]],
                                        max_distance_nm: float = 500.0) -> Dict[str, Any]:
        """
        Calculate whether a geopolitical event is relevant to a given route.
        Uses great-circle distance approximation to determine proximity.
        """
        if event_lat == 0.0 and event_lon == 0.0:
            return {"is_relevant": False, "relevance_score": 0.0, "nearest_distance_nm": None,
                    "reason": "Event location is global/unspecified"}

        min_distance = float('inf')
        for point in route_points:
            dist = self._haversine_nm(event_lat, event_lon, point.get("lat", 0), point.get("lon", 0))
            if dist < min_distance:
                min_distance = dist

        is_relevant = min_distance <= max_distance_nm
        relevance_score = round(max(0.0, 100.0 * (1.0 - min_distance / max_distance_nm)), 1) if is_relevant else 0.0

        return {
            "is_relevant": is_relevant,
            "relevance_score": relevance_score,
            "nearest_distance_nm": round(min_distance, 1),
            "reason": f"Event is {round(min_distance, 0)} NM from nearest route point"
        }

    @staticmethod
    def _haversine_nm(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Calculate great-circle distance in nautical miles."""
        R_nm = 3440.065  # Earth radius in nautical miles
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
        c = 2 * math.asin(math.sqrt(a))
        return R_nm * c
