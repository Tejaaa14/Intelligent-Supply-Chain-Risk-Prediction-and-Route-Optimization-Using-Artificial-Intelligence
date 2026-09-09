import uuid
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from app.database import database, crud
from app.services.scenario_service import scenario_service_instance

router = APIRouter(prefix="/api/scenario", tags=["Digital Twin Scenario"])

class ScenarioRequest(BaseModel):
    name: str
    weather_bonus: float = 0.0
    congestion_bonus: float = 0.0
    geo_bonus: float = 0.0
    fuel_price_bonus: float = 0.0

@router.post("/run")
def run_scenario(req: ScenarioRequest, db: Session = Depends(database.get_db)):
    """Apply a disruption scenario to the Digital Twin base state."""
    # 1. Update active service
    status = scenario_service_instance.apply_scenario(req.name, {
        "weather_bonus": req.weather_bonus,
        "congestion_bonus": req.congestion_bonus,
        "geo_bonus": req.geo_bonus,
        "fuel_price_bonus": req.fuel_price_bonus
    })
    
    # 2. Record to DB for audit/history
    scenario_id = f"SCN_{uuid.uuid4().hex[:8].upper()}"
    crud.clear_active_scenarios(db)  # Only one active scenario for demo
    crud.create_scenario_run(db, {
        "scenario_id": scenario_id,
        "name": req.name,
        "parameters": {
            "weather_bonus": req.weather_bonus,
            "congestion_bonus": req.congestion_bonus,
            "geo_bonus": req.geo_bonus,
            "fuel_price_bonus": req.fuel_price_bonus
        },
        "affected_vessels_count": 0, # Will be computed dynamically by clients
        "status": "ACTIVE"
    })
    
    return {"scenario_id": scenario_id, "status": status}

@router.post("/clear")
def clear_scenario(db: Session = Depends(database.get_db)):
    """Remove active scenarios and revert to pure Live Data."""
    scenario_service_instance.clear_scenarios()
    crud.clear_active_scenarios(db)
    return {"status": "Cleared, running Live Data only."}

@router.get("/current")
def get_current_scenario():
    """Returns the currently active scenario and disruption offsets."""
    return scenario_service_instance.get_status()
