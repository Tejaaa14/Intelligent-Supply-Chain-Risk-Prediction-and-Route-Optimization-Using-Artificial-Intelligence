from fastapi import APIRouter
from pydantic import BaseModel
from app.ml.risk_model import RiskPredictionModel
from app.ml.delay_model import DelayPredictionModel
from app.ml.cost_model import CostEstimationModel
from app.database import crud, database
from sqlalchemy.orm import Session
from fastapi import Depends

router = APIRouter(prefix="/api", tags=["Simulation"])

risk_model = RiskPredictionModel()
delay_model = DelayPredictionModel()

class ScenarioParams(BaseModel):
    weather_risk: float
    port_occupancy: float
    fuel_price: float
    geopolitical_risk: float

@router.post("/whatif")
def run_whatif_scenario(params: ScenarioParams, db: Session = Depends(database.get_db)):
    features = {
        "weather_risk": params.weather_risk,
        "port_waiting_time": params.port_occupancy / 5.0, # Approximate waiting time
        "port_occupancy": params.port_occupancy,
        "geopolitical_risk": params.geopolitical_risk,
        "fuel_price": params.fuel_price,
        "distance": 3200.0,
        "vessel_speed": 18.0
    }
    
    risk_res = risk_model.predict_risk(features)
    delay_res = delay_model.predict_delay(features)
    cost_res = CostEstimationModel.calculate_cost(
        distance_nm=features["distance"],
        speed_knots=features["vessel_speed"],
        fuel_price_per_mt=features["fuel_price"],
        predicted_delay_hours=delay_res["predicted_delay_hours"],
        port_waiting_hours=features["port_waiting_time"]
    )
    
    # Log audit event
    crud.log_audit(
        db=db,
        user="analyst_user",
        request_action="WHAT_IF_SIMULATION",
        risk_score=risk_res["risk_level"],
        details=f"Weather: {params.weather_risk}, Geo: {params.geopolitical_risk}, Fuel: {params.fuel_price}"
    )
    
    return {
        "risk_level": risk_res["risk_level"],
        "confidence": risk_res.get("confidence", 85.0), # If risk_res gives it, fine
        "predicted_delay_hours": delay_res["predicted_delay_hours"],
        "total_cost": cost_res.get("total_estimated_cost", cost_res.get("total_cost_usd", 0.0))
    }
