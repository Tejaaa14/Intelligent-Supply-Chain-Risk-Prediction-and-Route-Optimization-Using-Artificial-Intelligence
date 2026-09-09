from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import database, models

router = APIRouter(prefix="/api/audit", tags=["Audit Log"])

@router.get("")
def get_audit_logs(limit: int = 100, db: Session = Depends(database.get_db)):
    logs = db.query(models.AuditLog).order_by(models.AuditLog.timestamp.desc()).limit(limit).all()
    return [
        {
            "id": log.id,
            "timestamp": log.timestamp.isoformat(),
            "user": log.user,
            "request_action": log.request_action,
            "vessel_id": log.vessel_id,
            "shipment_id": log.shipment_id,
            "risk_score": log.risk_score,
            "recommended_route": log.recommended_route,
            "details": log.details
        }
        for log in logs
    ]
