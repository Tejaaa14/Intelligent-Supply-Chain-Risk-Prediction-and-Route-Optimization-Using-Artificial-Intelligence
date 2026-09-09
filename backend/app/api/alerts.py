from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import database, crud

router = APIRouter(prefix="/api/alerts", tags=["Alerts & Decision Support"])

@router.get("")
def get_alerts(db: Session = Depends(database.get_db)):
    alerts = crud.get_alerts(db)
    return [
        {
            "alert_id": a.alert_id,
            "shipment_id": a.shipment_id,
            "vessel_id": a.vessel_id,
            "alert_type": a.alert_type,
            "severity": a.severity,
            "title": a.title,
            "description": a.description,
            "recommended_action": a.recommended_action,
            "timestamp": a.timestamp.isoformat(),
            "is_resolved": a.is_resolved
        }
        for a in alerts
    ]
