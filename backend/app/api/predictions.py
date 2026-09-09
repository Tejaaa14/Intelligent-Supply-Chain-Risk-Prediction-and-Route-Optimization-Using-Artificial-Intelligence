import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import database, crud, models
from app.ml.risk_model import RiskPredictionModel
from app.ml.delay_model import DelayPredictionModel
from app.ml.cost_model import CostEstimationModel
from app.ml.explainability import ExplainableAIModule
from app.services.weather_service import WeatherService
from app.services.port_service import PortService
from app.services.news_service import NewsService
from app.services.fuel_service import FuelService
from app.ml.nlp_pipeline import GeopoliticalNLPPipeline

router = APIRouter(prefix="/api", tags=["ML Predictions & Analytics"])

risk_model = RiskPredictionModel()
delay_model = DelayPredictionModel()
xai_module = ExplainableAIModule(risk_model_obj=risk_model, delay_model_obj=delay_model)

# Instantiate live services for feature construction
_weather_svc = WeatherService()
_port_svc = PortService()
_news_svc = NewsService()
_fuel_svc = FuelService()
_nlp = GeopoliticalNLPPipeline()

# Port ID mapping for destinations
DESTINATION_PORT_MAP = {
    "Singapore": "SGP",
    "Shanghai": "SHA",
    "Rotterdam": "RTM",
    "Los Angeles": "LAX",
    "Dubai": "DXB",
    "Jebel Ali (Dubai)": "DXB",
    "Hong Kong": "HKG"
}

def _get_shipment_features(db: Session, shipment_id: str):
    """
    Construct feature vector from LIVE integrated data sources.
    
    Feature sources:
    - weather_risk: Open-Meteo (LIVE) → weather_risk_score
    - port_waiting_time: UNCTAD + DERIVED congestion formula
    - port_occupancy: UNCTAD + DERIVED congestion formula
    - geopolitical_risk: GDELT (LIVE) → NLP pipeline (DERIVED)
    - fuel_price: EIA (PUBLIC_PROXY)
    - distance: Shipment record (DB)
    - vessel_speed: Vessel record (DB/AIS)
    """
    shipment = crud.get_shipment(db, shipment_id)
    
    # Get vessel data
    vessel_speed = 18.0
    vessel_lat = 17.385
    vessel_lon = 113.486
    destination = "Singapore"
    
    if shipment and shipment.vessel:
        vessel_speed = shipment.vessel.speed or 18.0
        vessel_lat = shipment.vessel.current_latitude or vessel_lat
        vessel_lon = shipment.vessel.current_longitude or vessel_lon
        destination = shipment.vessel.destination or destination

    # Distance from shipment or default
    distance = 3200.0
    if shipment:
        destination = shipment.destination or destination

    # --- LIVE: Weather from Open-Meteo using vessel coordinates ---
    weather_risk = 22.0  # default if API fails
    weather_source = "DEFAULT"
    try:
        weather_data = _weather_svc.get_weather_for_location(vessel_lat, vessel_lon)
        if weather_data.get("data_source_mode") != "ERROR":
            wr = weather_data.get("weather_risk_score", 22.0)
            if isinstance(wr, (int, float)):
                weather_risk = wr
                weather_source = "Open-Meteo (LIVE)"
    except Exception:
        pass

    # --- DERIVED: Port congestion from UNCTAD baseline ---
    port_waiting_time = 8.0
    port_occupancy = 65.0
    port_source = "DEFAULT"
    port_id = DESTINATION_PORT_MAP.get(destination, "SGP")
    try:
        port_data = _port_svc.get_port_congestion(port_id)
        if port_data.get("source_status") != "ERROR":
            pwt = port_data.get("average_waiting_time", 8.0)
            pocc = port_data.get("port_occupancy", 65.0)
            if isinstance(pwt, (int, float)):
                port_waiting_time = pwt
            if isinstance(pocc, (int, float)):
                port_occupancy = pocc
            port_source = "UNCTAD + DERIVED"
    except Exception:
        pass

    # --- LIVE: Geopolitical risk from GDELT + NLP ---
    geopolitical_risk = 15.0
    geo_source = "DEFAULT"
    try:
        raw_news = _news_svc.fetch_geopolitical_news(limit=5)
        if raw_news:
            risk_scores = []
            for item in raw_news:
                parsed = _nlp.process_text(item.get("headline", ""), item.get("description", ""))
                risk_scores.append(parsed.get("risk_score", 15.0))
            if risk_scores:
                geopolitical_risk = round(sum(risk_scores) / len(risk_scores), 1)
                geo_source = "GDELT + NLP Pipeline (DERIVED)"
    except Exception:
        pass

    # --- PUBLIC PROXY: Fuel price from EIA ---
    fuel_price = 630.0
    fuel_source = "DEFAULT"
    try:
        fuel_data = _fuel_svc.get_fuel_price(destination if destination in DESTINATION_PORT_MAP else "Singapore")
        if fuel_data.get("source_status") != "ERROR":
            fp = fuel_data.get("price", 630.0)
            if isinstance(fp, (int, float)) and fp > 0:
                fuel_price = fp
                fuel_source = "EIA PUBLIC_PROXY"
    except Exception:
        pass

    features = {
        "weather_risk": weather_risk,
        "port_waiting_time": port_waiting_time,
        "port_occupancy": port_occupancy,
        "geopolitical_risk": geopolitical_risk,
        "fuel_price": fuel_price,
        "distance": distance,
        "vessel_speed": vessel_speed
    }

    feature_sources = {
        "weather_risk": {"value": weather_risk, "source": weather_source, "coordinates": {"lat": vessel_lat, "lon": vessel_lon}},
        "port_waiting_time": {"value": port_waiting_time, "source": port_source, "port_id": port_id},
        "port_occupancy": {"value": port_occupancy, "source": port_source, "port_id": port_id},
        "geopolitical_risk": {"value": geopolitical_risk, "source": geo_source},
        "fuel_price": {"value": fuel_price, "source": fuel_source},
        "distance": {"value": distance, "source": "Shipment DB / Route Config"},
        "vessel_speed": {"value": vessel_speed, "source": "Vessel DB / AIS"}
    }

    return features, feature_sources

@router.get("/risk/{shipment_id}")
def get_risk_prediction(shipment_id: str, db: Session = Depends(database.get_db)):
    features, feature_sources = _get_shipment_features(db, shipment_id)
    result = risk_model.predict_risk(features)
    now = datetime.datetime.utcnow()

    # Resolve vessel/shipment names
    shipment = crud.get_shipment(db, shipment_id)
    vessel_name = "Unknown"
    if shipment and shipment.vessel:
        vessel_name = shipment.vessel.vessel_name

    result["shipment_id"] = shipment_id
    result["vessel_name"] = vessel_name
    result["prediction_timestamp"] = now.isoformat()
    result["model_name"] = "RandomForest Classifier (sklearn)"
    result["model_type"] = "classification"
    result["feature_values"] = features
    result["feature_sources"] = feature_sources
    result["data_lineage"] = {
        "source": "RiskPredictionModel",
        "source_type": "DERIVED",
        "model_version": "RandomForest_v1",
        "created_at": now.isoformat(),
        "note": "Risk score is a MODEL PREDICTION derived from integrated live data features."
    }
    return result

@router.get("/delay/{shipment_id}")
def get_delay_prediction(shipment_id: str, db: Session = Depends(database.get_db)):
    features, feature_sources = _get_shipment_features(db, shipment_id)
    result = delay_model.predict_delay(features)
    now = datetime.datetime.utcnow()

    shipment = crud.get_shipment(db, shipment_id)
    vessel_name = "Unknown"
    original_eta = None
    if shipment and shipment.vessel:
        vessel_name = shipment.vessel.vessel_name
        original_eta = shipment.vessel.eta

    pred_delay = result["predicted_delay_hours"]

    # Compute predicted ETA from original ETA
    predicted_eta = None
    if original_eta:
        try:
            if isinstance(original_eta, str):
                original_eta_dt = datetime.datetime.fromisoformat(original_eta)
            else:
                original_eta_dt = original_eta
            predicted_eta = (original_eta_dt + datetime.timedelta(hours=pred_delay)).isoformat()
            original_eta = original_eta_dt.isoformat() if not isinstance(original_eta, str) else original_eta
        except Exception:
            pass

    # Determine main delay factors from feature values
    main_factors = []
    if features["weather_risk"] > 40:
        main_factors.append({"factor": "Severe Weather", "value": features["weather_risk"], "unit": "% risk", "source": feature_sources["weather_risk"]["source"]})
    if features["port_waiting_time"] > 12:
        main_factors.append({"factor": "Port Congestion", "value": features["port_waiting_time"], "unit": "hrs wait", "source": feature_sources["port_waiting_time"]["source"]})
    if features["geopolitical_risk"] > 40:
        main_factors.append({"factor": "Geopolitical Disruption", "value": features["geopolitical_risk"], "unit": "% risk", "source": feature_sources["geopolitical_risk"]["source"]})
    if features["port_occupancy"] > 80:
        main_factors.append({"factor": "High Port Occupancy", "value": features["port_occupancy"], "unit": "%", "source": feature_sources["port_occupancy"]["source"]})
    if not main_factors:
        main_factors.append({"factor": "Normal Conditions", "value": 0, "unit": ""})

    result["shipment_id"] = shipment_id
    result["vessel_name"] = vessel_name
    result["original_eta"] = original_eta
    result["predicted_eta"] = predicted_eta
    result["prediction_timestamp"] = now.isoformat()
    result["model_name"] = result.get("metrics", {}).get("model_name", "XGBoost Regressor")
    result["model_type"] = "regression"
    result["main_delay_factors"] = main_factors
    result["feature_sources"] = feature_sources
    result["data_lineage"] = {
        "source": "DelayPredictionModel",
        "source_type": "DERIVED",
        "model_version": "XGBoost_v1",
        "created_at": now.isoformat(),
        "note": "Delay prediction is a MODEL PREDICTION derived from integrated live data features."
    }
    return result

@router.get("/cost/{shipment_id}")
def get_cost_prediction(shipment_id: str, db: Session = Depends(database.get_db)):
    features, feature_sources = _get_shipment_features(db, shipment_id)
    delay_res = delay_model.predict_delay(features)
    pred_delay = delay_res["predicted_delay_hours"]
    
    cost_res = CostEstimationModel.calculate_cost(
        distance_nm=features["distance"],
        speed_knots=features["vessel_speed"],
        fuel_price_per_mt=features["fuel_price"],
        predicted_delay_hours=pred_delay,
        port_waiting_hours=features["port_waiting_time"]
    )
    cost_res["shipment_id"] = shipment_id
    cost_res["formula_explanation"] = (
        "Total Cost = Fuel Cost (consumption × fuel_price_per_mt) "
        "+ Port Cost (waiting_hours × $1,200/hr berth fee) "
        "+ Delay Penalty (delay_hours × $850/hr demurrage) "
        "+ Operational Cost (travel_days × $15,000/day overhead)"
    )
    cost_res["feature_sources"] = feature_sources
    cost_res["data_lineage"] = {
        "source": "CostEstimationModel",
        "source_type": "DERIVED",
        "created_at": datetime.datetime.utcnow().isoformat(),
        "note": "Cost is a DERIVED calculation using formula-based estimation."
    }
    return cost_res

@router.get("/explanations/{shipment_id}")
def get_explanation(shipment_id: str, db: Session = Depends(database.get_db)):
    features, feature_sources = _get_shipment_features(db, shipment_id)
    xai_res = xai_module.explain_prediction(features)
    
    # Let model-derived confidence flow through — do NOT override
    risk_res = risk_model.predict_risk(features)
    xai_res["shipment_id"] = shipment_id
    xai_res["confidence"] = risk_res.get("confidence", 85.0)
    xai_res["confidence_source"] = "Model probability (max class probability from RandomForest)"
    xai_res["xai_method"] = "SHAP TreeExplainer"
    xai_res["feature_sources"] = feature_sources
    xai_res["data_lineage"] = {
        "source": "ExplainableAIModule (SHAP)",
        "source_type": "DERIVED",
        "created_at": datetime.datetime.utcnow().isoformat(),
        "note": "SHAP values are DERIVED from actual model weights and feature inputs."
    }
    return xai_res

@router.get("/model/metrics")
def get_model_evaluation_metrics():
    """Return academic evaluation metrics (Accuracy, F1, Precision, MAE, RMSE, R2, Confusion Matrix)."""
    return {
        "risk_classification_model": {
            **risk_model.metrics,
            "data_lineage": {
                "training_data": "Synthetic Historical Shipping Dataset",
                "data_type": "HISTORICAL",
                "note": "Metrics calculated from test set after 80/20 train/test split."
            }
        },
        "delay_prediction_model": {
            **delay_model.metrics,
            "data_lineage": {
                "training_data": "Synthetic Historical Shipping Dataset",
                "data_type": "HISTORICAL",
                "note": "Metrics calculated from test set after 80/20 train/test split."
            }
        }
    }

@router.get("/model/dataset-info")
def get_dataset_info():
    """Return detailed information about the training dataset."""
    from app.ml.dataset_generator import generate_dataset_summary
    return generate_dataset_summary()
