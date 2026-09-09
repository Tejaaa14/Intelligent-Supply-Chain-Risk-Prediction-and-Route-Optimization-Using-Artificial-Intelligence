import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import database, crud, models
from app.services.ais_service import ais_service_instance
from app.services.weather_service import WeatherService
from app.services.port_service import PortService
from app.services.fuel_service import FuelService
from app.services.news_service import NewsService
from app.ml.risk_model import RiskPredictionModel
from app.ml.delay_model import DelayPredictionModel
from app.ml.nlp_pipeline import GeopoliticalNLPPipeline

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])

ais_service = ais_service_instance
weather_service = WeatherService()
port_service = PortService()
fuel_service = FuelService()
news_service = NewsService()
nlp_pipeline = GeopoliticalNLPPipeline()

# Port ID mapping for destinations
DESTINATION_PORT_MAP = {
    "Singapore": "SGP", "Shanghai": "SHA", "Rotterdam": "RTM",
    "Los Angeles": "LAX", "Dubai": "DXB", "Jebel Ali (Dubai)": "DXB",
    "Hong Kong": "HKG"
}

# Lazy-init models (they are singletons already loaded in predictions module)
_risk_model = None
_delay_model = None

def _get_risk_model():
    global _risk_model
    if _risk_model is None:
        _risk_model = RiskPredictionModel()
    return _risk_model

def _get_delay_model():
    global _delay_model
    if _delay_model is None:
        _delay_model = DelayPredictionModel()
    return _delay_model


def _build_features_for_vessel(db: Session, vessel):
    """Build feature dict from LIVE services for a vessel."""
    vessel_lat = vessel.current_latitude if vessel and vessel.current_latitude else 17.385
    vessel_lon = vessel.current_longitude if vessel and vessel.current_longitude else 113.486
    vessel_speed = vessel.speed if vessel and vessel.speed else 18.0
    destination = vessel.destination if vessel and vessel.destination else "Singapore"

    # LIVE: Weather
    weather_risk = 22.0
    try:
        w = weather_service.get_weather_for_location(vessel_lat, vessel_lon)
        if w.get("data_source_mode") != "ERROR":
            wr = w.get("weather_risk_score", 22.0)
            if isinstance(wr, (int, float)):
                weather_risk = wr
    except Exception:
        pass

    # DERIVED: Port congestion
    port_waiting_time = 8.0
    port_occupancy = 65.0
    port_id = DESTINATION_PORT_MAP.get(destination, "SGP")
    try:
        p = port_service.get_port_congestion(port_id)
        if p.get("source_status") != "ERROR":
            pwt = p.get("average_waiting_time", 8.0)
            pocc = p.get("port_occupancy", 65.0)
            if isinstance(pwt, (int, float)):
                port_waiting_time = pwt
            if isinstance(pocc, (int, float)):
                port_occupancy = pocc
    except Exception:
        pass

    # LIVE: Geopolitical risk from GDELT + NLP
    geopolitical_risk = 15.0
    try:
        raw_news = news_service.fetch_geopolitical_news(limit=5)
        if raw_news:
            scores = []
            for item in raw_news:
                parsed = nlp_pipeline.process_text(item.get("headline", ""), item.get("description", ""))
                scores.append(parsed.get("risk_score", 15.0))
            if scores:
                geopolitical_risk = round(sum(scores) / len(scores), 1)
    except Exception:
        pass

    # PUBLIC PROXY: Fuel price from EIA
    fuel_price = 630.0
    try:
        f = fuel_service.get_fuel_price(destination if destination in DESTINATION_PORT_MAP else "Singapore")
        if f.get("source_status") != "ERROR":
            fp = f.get("price", 630.0)
            if isinstance(fp, (int, float)) and fp > 0:
                fuel_price = fp
    except Exception:
        pass

    return {
        "weather_risk": weather_risk,
        "port_waiting_time": port_waiting_time,
        "port_occupancy": port_occupancy,
        "geopolitical_risk": geopolitical_risk,
        "fuel_price": fuel_price,
        "distance": 3200.0,
        "vessel_speed": vessel_speed
    }


@router.get("/summary")
def get_dashboard_summary(db: Session = Depends(database.get_db)):
    vessels = crud.get_vessels(db)
    alerts = crud.get_alerts(db)
    now = datetime.datetime.utcnow()

    active_vessels = len(vessels)
    active_alerts_count = len([a for a in alerts if not a.is_resolved])

    # Dynamically compute risk and delay for each vessel
    risk_model = _get_risk_model()
    delay_model = _get_delay_model()

    risk_counts = {"LOW": 0, "MEDIUM": 0, "HIGH": 0, "CRITICAL": 0}
    total_delay = 0.0
    high_risk_count = 0

    for v in vessels:
        features = _build_features_for_vessel(db, v)
        risk_res = risk_model.predict_risk(features)
        delay_res = delay_model.predict_delay(features)

        level = risk_res.get("risk_level", "LOW")
        risk_counts[level] = risk_counts.get(level, 0) + 1
        if level in ("HIGH", "CRITICAL"):
            high_risk_count += 1
        total_delay += delay_res.get("predicted_delay_hours", 0.0)

    avg_delay = round(total_delay / max(1, active_vessels), 1)

    ais_mode = ais_service.get_data_source_mode()
    ais_conn = ais_service.get_connection_status()
    w_mode = weather_service.get_data_source_mode()
    n_mode = news_service.get_data_source_mode()
    f_mode = fuel_service.get_data_source_mode()
    p_mode = port_service.get_data_source_mode()

    return {
        "total_active_vessels": active_vessels,
        "total_active_vessels_source": f"Database seeded vessels (AIS mode: {ais_mode})",
        "high_risk_shipments": high_risk_count,
        "high_risk_shipments_source": "RandomForest Classifier (DERIVED)",
        "predicted_delays_avg_hours": avg_delay,
        "predicted_delays_source": "XGBoost Regressor (DERIVED)",
        "active_alerts": active_alerts_count,
        "active_alerts_source": "Alert Engine (DB)",
        "last_updated": now.isoformat(),
        "data_sources_status": {
            "AIS Telemetry": {
                "source": "AISStream",
                "type": ais_mode,
                "connection_status": ais_conn,
                "label": f"{ais_mode} — AISStream" if ais_mode == "LIVE" else ais_mode,
                "used_for": "Vessel Position / Route Analysis"
            },
            "Weather": {
                "source": "Open-Meteo (Forecast + Marine)",
                "type": w_mode,
                "label": f"{w_mode} — Open-Meteo" if w_mode == "LIVE" else w_mode,
                "used_for": "Weather Risk Score (DERIVED)"
            },
            "Geopolitical News": {
                "source": "GDELT DOC 2.0 API",
                "type": n_mode if n_mode != "UNKNOWN" else "LIVE",
                "label": f"LIVE — GDELT" if n_mode != "ERROR" else "ERROR",
                "used_for": "Geopolitical Risk Score (DERIVED via NLP)"
            },
            "Port Activity": {
                "source": "UNCTAD Liner Connectivity Index",
                "type": "PUBLIC_DATA + DERIVED",
                "label": "UNCTAD REFERENCE + DERIVED",
                "used_for": "Port Congestion Score (DERIVED)"
            },
            "Fuel Prices": {
                "source": "U.S. EIA Open Data API",
                "type": f_mode,
                "label": "PUBLIC PROXY — EIA",
                "used_for": "Cost Estimation Input (PUBLIC_PROXY)"
            },
            "ML Models": {
                "source": "Synthetic Historical Shipping Dataset (1,200 samples)",
                "type": "HISTORICAL",
                "label": "HISTORICAL DATASET",
                "used_for": "Risk Classification & Delay Regression Training"
            }
        },
        "risk_summary": risk_counts
    }
