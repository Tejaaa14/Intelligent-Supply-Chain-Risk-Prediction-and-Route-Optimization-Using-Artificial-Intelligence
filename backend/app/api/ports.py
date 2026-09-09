from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import database, crud
from app.services.port_service import PortService

router = APIRouter(prefix="/api/ports", tags=["Ports"])
port_service = PortService()

@router.get("")
def list_ports(db: Session = Depends(database.get_db)):
    return port_service.get_all_ports()

@router.get("/{port_id}")
def get_port_details(port_id: str, db: Session = Depends(database.get_db)):
    port = port_service.get_port_congestion(port_id)
    if not port:
        raise HTTPException(status_code=404, detail="Port not found")
    return port
