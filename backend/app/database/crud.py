from sqlalchemy.orm import Session
import datetime
import uuid
from app.database import models

# Vessels CRUD
def get_vessels(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Vessel).offset(skip).limit(limit).all()

def get_vessel(db: Session, vessel_id: str):
    return db.query(models.Vessel).filter(models.Vessel.vessel_id == vessel_id).first()

def create_or_update_vessel(db: Session, vessel_data: dict):
    valid_keys = {c.name for c in models.Vessel.__table__.columns}
    clean_dict = {k: v for k, v in vessel_data.items() if k in valid_keys}
    vessel = db.query(models.Vessel).filter(models.Vessel.vessel_id == clean_dict["vessel_id"]).first()
    if not vessel:
        vessel = models.Vessel(**clean_dict)
        db.add(vessel)
    else:
        for key, value in clean_dict.items():
            setattr(vessel, key, value)
    db.commit()
    db.refresh(vessel)
    return vessel

def add_vessel_position(db: Session, vessel_id: str, lat: float, lon: float, speed: float, heading: float):
    pos = models.VesselPosition(
        vessel_id=vessel_id,
        latitude=lat,
        longitude=lon,
        speed=speed,
        heading=heading,
        timestamp=datetime.datetime.utcnow()
    )
    db.add(pos)
    db.commit()
    return pos

# Ports CRUD
def get_ports(db: Session):
    return db.query(models.Port).all()

def get_port(db: Session, port_id: str):
    return db.query(models.Port).filter(models.Port.port_id == port_id).first()

def create_or_update_port(db: Session, port_data: dict):
    port_copy = dict(port_data)
    if "timestamp" in port_copy and isinstance(port_copy["timestamp"], str):
        try:
            port_copy["timestamp"] = datetime.datetime.fromisoformat(port_copy["timestamp"])
        except Exception:
            port_copy["timestamp"] = datetime.datetime.utcnow()
    valid_keys = {c.name for c in models.Port.__table__.columns}
    clean_dict = {k: v for k, v in port_copy.items() if k in valid_keys}
    port = db.query(models.Port).filter(models.Port.port_id == clean_dict["port_id"]).first()
    if not port:
        port = models.Port(**clean_dict)
        db.add(port)
    else:
        for key, value in clean_dict.items():
            setattr(port, key, value)
    db.commit()
    db.refresh(port)
    return port

# Weather CRUD
def save_weather(db: Session, weather_data: dict):
    w_copy = dict(weather_data)
    if "timestamp" in w_copy and isinstance(w_copy["timestamp"], str):
        try:
            w_copy["timestamp"] = datetime.datetime.fromisoformat(w_copy["timestamp"])
        except Exception:
            w_copy["timestamp"] = datetime.datetime.utcnow()
    valid_keys = {c.name for c in models.WeatherData.__table__.columns}
    clean_dict = {k: v for k, v in w_copy.items() if k in valid_keys}
    weather = models.WeatherData(**clean_dict)
    db.add(weather)
    db.commit()
    db.refresh(weather)
    return weather

def get_latest_weather_near(db: Session, lat: float, lon: float, max_dist_deg: float = 5.0):
    # Retrieve weather records within bounding box
    return db.query(models.WeatherData).filter(
        models.WeatherData.latitude.between(lat - max_dist_deg, lat + max_dist_deg),
        models.WeatherData.longitude.between(lon - max_dist_deg, lon + max_dist_deg)
    ).order_by(models.WeatherData.timestamp.desc()).first()

# Fuel Price CRUD
def get_fuel_prices(db: Session):
    return db.query(models.FuelPrice).all()

def get_fuel_price_for_region(db: Session, region: str):
    return db.query(models.FuelPrice).filter(models.FuelPrice.region == region).order_by(models.FuelPrice.updated_at.desc()).first()

# News CRUD
def get_recent_news(db: Session, limit: int = 20):
    return db.query(models.NewsEvent).order_by(models.NewsEvent.published_time.desc()).limit(limit).all()

def add_news_event(db: Session, news_data: dict):
    news = models.NewsEvent(**news_data)
    db.add(news)
    db.commit()
    db.refresh(news)
    return news

# Shipments CRUD
def get_shipment(db: Session, shipment_id: str):
    return db.query(models.Shipment).filter(models.Shipment.shipment_id == shipment_id).first()

def get_shipments(db: Session):
    return db.query(models.Shipment).all()

# Alerts CRUD
def get_alerts(db: Session, limit: int = 50):
    return db.query(models.Alert).order_by(models.Alert.timestamp.desc()).limit(limit).all()

def create_alert(db: Session, alert_data: dict):
    alert_id = alert_data.get("alert_id", f"ALT_{uuid.uuid4().hex[:8].upper()}")
    alert = models.Alert(alert_id=alert_id, **{k: v for k, v in alert_data.items() if k != "alert_id"})
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return alert

# Audit Logs CRUD
def log_audit(db: Session, user: str, request_action: str, vessel_id: str = None, shipment_id: str = None, risk_score: float = None, recommended_route: str = None, details: str = None):
    log = models.AuditLog(
        timestamp=datetime.datetime.utcnow(),
        user=user,
        request_action=request_action,
        vessel_id=vessel_id,
        shipment_id=shipment_id,
        risk_score=risk_score,
        recommended_route=recommended_route,
        details=details
    )
    db.add(log)
    db.commit()
    return log

# Quantum Job CRUD
def get_quantum_job(db: Session, job_id: str):
    return db.query(models.QuantumJob).filter(models.QuantumJob.job_id == job_id).first()

def create_quantum_job(db: Session, job_data: dict):
    job = models.QuantumJob(**job_data)
    db.add(job)
    db.commit()
    db.refresh(job)
    return job

def update_quantum_job(db: Session, job_id: str, update_data: dict):
    job = db.query(models.QuantumJob).filter(models.QuantumJob.job_id == job_id).first()
    if job:
        for key, value in update_data.items():
            setattr(job, key, value)
        db.commit()
        db.refresh(job)
    return job

# Scenario CRUD
def get_scenario_run(db: Session, scenario_id: str):
    return db.query(models.ScenarioRun).filter(models.ScenarioRun.scenario_id == scenario_id).first()

def get_active_scenarios(db: Session):
    return db.query(models.ScenarioRun).filter(models.ScenarioRun.status == "ACTIVE").all()

def create_scenario_run(db: Session, scenario_data: dict):
    scenario = models.ScenarioRun(**scenario_data)
    db.add(scenario)
    db.commit()
    db.refresh(scenario)
    return scenario

def clear_active_scenarios(db: Session):
    scenarios = db.query(models.ScenarioRun).filter(models.ScenarioRun.status == "ACTIVE").all()
    for s in scenarios:
        s.status = "CLEARED"
    db.commit()
