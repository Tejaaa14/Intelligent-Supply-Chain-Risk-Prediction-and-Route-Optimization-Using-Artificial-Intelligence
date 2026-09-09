from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import database, crud
from app.services.weather_service import WeatherService

router = APIRouter(prefix="/api/weather", tags=["Weather"])
weather_service = WeatherService()

@router.get("/{vessel_id}")
def get_vessel_weather(vessel_id: str, db: Session = Depends(database.get_db)):
    vessel = crud.get_vessel(db, vessel_id)
    if not vessel:
        # Default coordinates for fallback
        lat, lon, name = 14.5995, 112.0000, "South China Sea Transit"
    else:
        lat, lon, name = vessel.current_latitude or 14.5995, vessel.current_longitude or 112.0000, f"Near {vessel.vessel_name}"

    weather = weather_service.get_weather_for_location(lat, lon, name)
    return weather
