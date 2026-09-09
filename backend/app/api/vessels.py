from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import database, crud, models
from app.services.ais_service import ais_service_instance

router = APIRouter(prefix="/api/vessels", tags=["Vessels"])

from pydantic import BaseModel

class BoundsRequest(BaseModel):
    region: Optional[str] = None
    min_lat: Optional[float] = None
    max_lat: Optional[float] = None
    min_lon: Optional[float] = None
    max_lon: Optional[float] = None

# Predefined maritime regions
REGIONS = {
    "Arabian Sea": [10.0, 25.0, 50.0, 75.0],
    "Bay of Bengal": [5.0, 22.0, 80.0, 100.0],
    "Singapore Strait": [1.0, 1.5, 103.5, 104.5],
    "South China Sea": [3.0, 23.0, 100.0, 121.0],
    "Indian Ocean": [-40.0, 25.0, 40.0, 110.0],
    "Persian Gulf": [24.0, 30.0, 48.0, 56.0],
    "Mediterranean": [30.0, 45.0, -5.0, 35.0],
    "North Atlantic": [10.0, 60.0, -80.0, -10.0],
    "Pacific Ocean": [-50.0, 50.0, 120.0, -120.0]  # rough bounding
}

@router.post("/bounds")
def update_bounds(req: BoundsRequest):
    if req.region and req.region in REGIONS:
        box = REGIONS[req.region]
        ais_service_instance.update_bounding_boxes(box[0], box[1], box[2], box[3])
        return {"status": f"Bounds updated to {req.region}", "boxes": ais_service_instance.bounding_boxes}
    elif req.min_lat is not None and req.max_lat is not None and req.min_lon is not None and req.max_lon is not None:
        ais_service_instance.update_bounding_boxes(req.min_lat, req.max_lat, req.min_lon, req.max_lon)
        return {"status": "Bounds updated from coordinates", "boxes": ais_service_instance.bounding_boxes}
    else:
        raise HTTPException(status_code=400, detail="Must provide region or coordinates")

@router.get("/status")
def get_ais_status():
    """Return full AIS connection metadata and vessel list with source traceability."""
    return ais_service_instance.get_all_vessels_with_status()

@router.get("")
def list_vessels(
    min_lat: Optional[float] = Query(None),
    max_lat: Optional[float] = Query(None),
    min_lon: Optional[float] = Query(None),
    max_lon: Optional[float] = Query(None),
    db: Session = Depends(database.get_db)
):
    vessels = ais_service_instance.get_all_vessels()
    
    if all(x is not None for x in [min_lat, max_lat, min_lon, max_lon]):
        filtered = []
        for v in vessels:
            lat = v.get("latitude")
            lon = v.get("longitude")
            if lat is not None and lon is not None:
                if min_lat <= lat <= max_lat and min_lon <= lon <= max_lon:
                    filtered.append(v)
        return filtered
        
    return vessels

@router.get("/{vessel_id}")
def get_vessel_details(vessel_id: str, db: Session = Depends(database.get_db)):
    vessel = ais_service_instance.get_vessel(vessel_id)
    if not vessel:
        v_db = crud.get_vessel(db, vessel_id)
        if not v_db:
            raise HTTPException(status_code=404, detail="Vessel not found")
        vessel = {
            "vessel_id": v_db.vessel_id,
            "imo_number": v_db.imo_number,
            "vessel_name": v_db.vessel_name,
            "vessel_type": v_db.vessel_type,
            "latitude": v_db.current_latitude,
            "longitude": v_db.current_longitude,
            "speed": v_db.speed,
            "heading": v_db.heading,
            "destination": v_db.destination,
            "eta": v_db.eta,
            "status": v_db.status,
            "data_source_mode": v_db.data_source_mode
        }
    
    positions = db.query(models.VesselPosition).filter(models.VesselPosition.vessel_id == vessel_id).order_by(models.VesselPosition.timestamp.desc()).limit(30).all()
    shipment = db.query(models.Shipment).filter(models.Shipment.vessel_id == vessel_id, models.Shipment.status == "IN_TRANSIT").first()

    return {
        **vessel,
        "shipment_id": shipment.shipment_id if shipment else "SHIP_001",
        "position_history": [
            {"lat": p.latitude, "lon": p.longitude, "speed": p.speed, "timestamp": p.timestamp.isoformat()}
            for p in positions
        ]
    }
