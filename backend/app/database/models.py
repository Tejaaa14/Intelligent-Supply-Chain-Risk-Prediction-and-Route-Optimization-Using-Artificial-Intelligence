import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.database.database import Base

class Vessel(Base):
    __tablename__ = "vessels"

    vessel_id = Column(String, primary_key=True, index=True)
    imo_number = Column(String, unique=True, index=True)
    vessel_name = Column(String, nullable=False)
    vessel_type = Column(String, default="Container Ship")
    capacity_teu = Column(Integer, default=15000)
    current_latitude = Column(Float)
    current_longitude = Column(Float)
    speed = Column(Float, default=18.0)  # knots
    heading = Column(Float, default=90.0)  # degrees
    course = Column(Float, default=90.0)
    destination = Column(String)
    eta = Column(String)
    status = Column(String, default="UNDERWAY")
    data_source_mode = Column(String, default="SIMULATED")  # LIVE or SIMULATED
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    positions = relationship("VesselPosition", back_populates="vessel", cascade="all, delete-orphan")
    shipments = relationship("Shipment", back_populates="vessel")

class VesselPosition(Base):
    __tablename__ = "vessel_positions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    vessel_id = Column(String, ForeignKey("vessels.vessel_id"))
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    speed = Column(Float)
    heading = Column(Float)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

    vessel = relationship("Vessel", back_populates="positions")

class Port(Base):
    __tablename__ = "ports"

    port_id = Column(String, primary_key=True, index=True)
    port_name = Column(String, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    waiting_vessels = Column(Integer, default=12)
    average_waiting_time = Column(Float, default=14.5)  # hours
    port_occupancy = Column(Float, default=75.0)  # percentage
    berth_status = Column(String, default="NORMAL")
    congestion_level = Column(String, default="MEDIUM")  # LOW, MEDIUM, HIGH, CRITICAL
    data_source_mode = Column(String, default="SIMULATED")
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow)

class WeatherData(Base):
    __tablename__ = "weather_data"

    id = Column(Integer, primary_key=True, autoincrement=True)
    location_name = Column(String, index=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    temperature = Column(Float)
    wind_speed = Column(Float)  # knots or km/h
    wind_direction = Column(Float)
    precipitation = Column(Float)
    visibility = Column(Float)  # km
    wave_height = Column(Float)  # meters
    storm_condition = Column(String, default="NONE")
    weather_code = Column(Integer, default=0)
    weather_risk_score = Column(Float, default=0.0)
    data_source_mode = Column(String, default="LIVE")  # e.g., Open-Meteo
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

class FuelPrice(Base):
    __tablename__ = "fuel_prices"

    id = Column(Integer, primary_key=True, autoincrement=True)
    region = Column(String, nullable=False, index=True)
    fuel_type = Column(String, default="VLSFO")
    price_per_mt = Column(Float, nullable=False)  # USD per Metric Ton
    currency = Column(String, default="USD")
    source = Column(String, default="Global Marine Index")
    data_source_mode = Column(String, default="SIMULATED")
    updated_at = Column(DateTime, default=datetime.datetime.utcnow)

class NewsEvent(Base):
    __tablename__ = "news_events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    headline = Column(String, nullable=False)
    description = Column(Text)
    source = Column(String)
    published_time = Column(DateTime, default=datetime.datetime.utcnow)
    location = Column(String)
    country = Column(String)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    keywords = Column(JSON)  # list of strings
    event_type = Column(String)  # WAR, CONFLICT, STRIKE, SANCTION, PORT_CLOSURE, STORM, BLOCKADE, etc.
    sentiment = Column(Float, default=0.0)
    risk_score = Column(Float, default=0.0)  # 0 to 100
    data_source_mode = Column(String, default="SIMULATED")

class Shipment(Base):
    __tablename__ = "shipments"

    shipment_id = Column(String, primary_key=True, index=True)
    vessel_id = Column(String, ForeignKey("vessels.vessel_id"))
    cargo_description = Column(String, default="Electronics & Consumer Goods")
    origin = Column(String, nullable=False)
    destination = Column(String, nullable=False)
    planned_departure = Column(DateTime)
    planned_eta = Column(DateTime)
    actual_arrival = Column(DateTime, nullable=True)
    status = Column(String, default="IN_TRANSIT")
    current_route_id = Column(String, nullable=True)

    vessel = relationship("Vessel", back_populates="shipments")
    routes = relationship("RouteOption", back_populates="shipment", cascade="all, delete-orphan")

class RouteOption(Base):
    __tablename__ = "routes"

    route_id = Column(String, primary_key=True, index=True)
    shipment_id = Column(String, ForeignKey("shipments.shipment_id"))
    route_name = Column(String)  # e.g., "Route A (Direct)", "Route B (Via Lombok)"
    origin = Column(String)
    destination = Column(String)
    waypoints_json = Column(JSON)  # List of [lat, lon] coordinates
    distance_nautical_miles = Column(Float)
    travel_time_hours = Column(Float)
    fuel_cost = Column(Float)
    weather_risk = Column(Float)
    congestion_risk = Column(Float)
    geopolitical_risk = Column(Float)
    total_risk_score = Column(Float)
    predicted_delay_hours = Column(Float)
    estimated_total_cost = Column(Float)
    is_recommended = Column(Boolean, default=False)

    shipment = relationship("Shipment", back_populates="routes")

class RiskPrediction(Base):
    __tablename__ = "risk_predictions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    shipment_id = Column(String, ForeignKey("shipments.shipment_id"))
    risk_probability = Column(Float)  # 0 to 100 percentage
    risk_level = Column(String)  # LOW, MEDIUM, HIGH, CRITICAL
    confidence = Column(Float)  # 0 to 100 percentage
    weather_contrib = Column(Float, default=0.0)
    congestion_contrib = Column(Float, default=0.0)
    geopolitical_contrib = Column(Float, default=0.0)
    historical_contrib = Column(Float, default=0.0)
    fuel_contrib = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class DelayPrediction(Base):
    __tablename__ = "delay_predictions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    shipment_id = Column(String, ForeignKey("shipments.shipment_id"))
    predicted_delay_hours = Column(Float)
    probability_of_delay = Column(Float)
    confidence = Column(Float)
    model_name = Column(String, default="XGBoost Regressor v1.0")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class CostPrediction(Base):
    __tablename__ = "cost_predictions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    shipment_id = Column(String, ForeignKey("shipments.shipment_id"))
    fuel_cost = Column(Float)
    port_cost = Column(Float)
    delay_cost = Column(Float)
    operational_cost = Column(Float)
    total_estimated_cost = Column(Float)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class RouteRecommendation(Base):
    __tablename__ = "route_recommendations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    shipment_id = Column(String, ForeignKey("shipments.shipment_id"))
    recommended_route_id = Column(String)
    confidence = Column(Float)
    explanation_text = Column(Text)
    shap_values_json = Column(JSON)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Alert(Base):
    __tablename__ = "alerts"

    alert_id = Column(String, primary_key=True, index=True)
    shipment_id = Column(String)
    vessel_id = Column(String)
    alert_type = Column(String)  # WEATHER, CONGESTION, GEOPOLITICAL, HIGH_RISK, REROUTE
    severity = Column(String)  # INFO, WARNING, HIGH, CRITICAL
    title = Column(String)
    description = Column(Text)
    recommended_action = Column(Text)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    is_resolved = Column(Boolean, default=False)

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    user = Column(String, default="logistics_admin")
    request_action = Column(String)
    vessel_id = Column(String, nullable=True)
    shipment_id = Column(String, nullable=True)
    risk_score = Column(Float, nullable=True)
    recommended_route = Column(String, nullable=True)
    details = Column(Text)

class QuantumJob(Base):
    __tablename__ = "quantum_jobs"

    job_id = Column(String, primary_key=True, index=True)
    shipment_id = Column(String)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    status = Column(String, default="PENDING")  # PENDING, RUNNING, COMPLETED, FAILED
    configuration = Column(JSON)  # depth, shots, optimizer
    qubo_json = Column(JSON)
    candidate_routes = Column(JSON)
    quantum_result = Column(JSON)
    classical_comparison = Column(JSON)
    execution_time_ms = Column(Float)

class ScenarioRun(Base):
    __tablename__ = "scenario_runs"

    scenario_id = Column(String, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    name = Column(String)
    parameters = Column(JSON)
    affected_vessels_count = Column(Integer)
    status = Column(String, default="ACTIVE")
