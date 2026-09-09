from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import database
from app.services.ais_service import ais_service_instance
from app.services.weather_service import WeatherService
from app.services.news_service import NewsService

router = APIRouter(prefix="/api/system", tags=["System"])

ais_service = ais_service_instance
weather_service = WeatherService()
news_service = NewsService()

@router.get("/health")
def get_system_health(db: Session = Depends(database.get_db)):
    # Simple db check
    db_status = "OK"
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        db_status = "DOWN"

    return {
        "backend": "OK",
        "database": db_status,
        "ml_service": "OK",
        "weather": "OK" if weather_service.get_data_source_mode() == "LIVE" else "FALLBACK",
        "news": "OK" if news_service.get_data_source_mode() == "LIVE" else "FALLBACK",
        "ais": "OK" if ais_service.get_data_source_mode() == "LIVE" else "SIMULATED",
        "port": "OK",
        "fuel": "OK"
    }
