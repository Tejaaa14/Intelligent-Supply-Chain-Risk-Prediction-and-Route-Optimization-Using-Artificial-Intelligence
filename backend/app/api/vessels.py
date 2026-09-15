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
    db_vessels = {v.vessel_id: v for v in crud.get_vessels(db)}
    active_shipments = {s.vessel_id: s for s in db.query(models.Shipment).filter(models.Shipment.status == "IN_TRANSIT").all()}
    
    merged_vessels = []
    
    live_vessels = ais_service_instance.get_all_vessels()
    for v in live_vessels:
        vid = v["vessel_id"]
        shipment = active_shipments.get(vid)
        
        v["origin"] = shipment.origin if shipment else "N/A"
        v["current_route_id"] = shipment.current_route_id if shipment else "N/A"
        v["course"] = v.get("heading", "N/A")
        vid = v["vessel_id"]
        if vid in db_vessels:
            v_db = db_vessels[vid]
            if v.get("imo_number") in ("N/A", None) and v_db.imo_number:
                v["imo_number"] = v_db.imo_number
            if v.get("destination") in ("N/A", None, "") and v_db.destination:
                v["destination"] = v_db.destination
            if v.get("eta") in ("N/A", None) and v_db.eta:
                v["eta"] = v_db.eta
            if v.get("vessel_name") in ("N/A", None, "") and v_db.vessel_name:
                v["vessel_name"] = v_db.vessel_name
        
        if shipment and shipment.destination:
            v["destination"] = shipment.destination
            
        merged_vessels.append(v)
        
    live_ids = {v["vessel_id"] for v in live_vessels}
    for vid, v_db in db_vessels.items():
        if vid not in live_ids:
            shipment = active_shipments.get(vid)
            merged_vessels.append({
                "vessel_id": v_db.vessel_id,
                "mmsi": v_db.vessel_id.replace("VSL_", ""),
                "imo_number": v_db.imo_number or "N/A",
                "vessel_name": v_db.vessel_name or "N/A",
                "vessel_type": v_db.vessel_type or "N/A",
                "latitude": v_db.current_latitude,
                "longitude": v_db.current_longitude,
                "speed": v_db.speed,
                "heading": v_db.heading,
                "course": v_db.heading,
                "origin": shipment.origin if shipment else "N/A",
                "destination": shipment.destination if shipment and shipment.destination else (v_db.destination or "N/A"),
                "eta": v_db.eta or "N/A",
                "status": v_db.status or "N/A",
                "current_route_id": shipment.current_route_id if shipment else "N/A",
                "data_source_mode": v_db.data_source_mode or "SIMULATION",
                "source_type": "SIMULATION"
            })
            
    vessels = merged_vessels
    
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
    v_db = crud.get_vessel(db, vessel_id)
    
    if vessel and v_db:
        if vessel.get("imo_number") in ("N/A", None) and v_db.imo_number:
            vessel["imo_number"] = v_db.imo_number
        if vessel.get("destination") in ("N/A", None, "") and v_db.destination:
            vessel["destination"] = v_db.destination
        if vessel.get("eta") in ("N/A", None) and v_db.eta:
            vessel["eta"] = v_db.eta
        if vessel.get("vessel_name") in ("N/A", None, "") and v_db.vessel_name:
            vessel["vessel_name"] = v_db.vessel_name
    elif not vessel:
        if not v_db:
            raise HTTPException(status_code=404, detail="Vessel not found")
        vessel = {
            "vessel_id": v_db.vessel_id,
            "imo_number": v_db.imo_number or "N/A",
            "vessel_name": v_db.vessel_name or "N/A",
            "vessel_type": v_db.vessel_type or "N/A",
            "latitude": v_db.current_latitude,
            "longitude": v_db.current_longitude,
            "speed": v_db.speed,
            "heading": v_db.heading,
            "destination": v_db.destination or "N/A",
            "eta": v_db.eta or "N/A",
            "status": v_db.status or "N/A",
            "data_source_mode": v_db.data_source_mode or "DB",
            "source_type": "DB"
        }
    
    positions = db.query(models.VesselPosition).filter(models.VesselPosition.vessel_id == vessel_id).order_by(models.VesselPosition.timestamp.desc()).limit(30).all()
    shipment = db.query(models.Shipment).filter(models.Shipment.vessel_id == vessel_id, models.Shipment.status == "IN_TRANSIT").first()

    extra_details = {
        "shipment_id": shipment.shipment_id if shipment else "SHIP_001",
        "origin": shipment.origin if shipment else "N/A",
        "current_route_id": shipment.current_route_id if shipment else "N/A",
        "risk_score": 0.0,
        "risk_level": "N/A",
        "weather_risk": 0.0,
        "port_congestion_risk": 0.0,
        "geopolitical_risk": 0.0,
        "predicted_delay": 0.0,
        "estimated_cost": 0.0,
        "retrieved_time": __import__('datetime').datetime.utcnow().isoformat(),
        "course": vessel.get("heading", "N/A")
    }

    if shipment:
        if shipment.destination:
            vessel["destination"] = shipment.destination
            
        risk = db.query(models.RiskPrediction).filter(models.RiskPrediction.shipment_id == shipment.shipment_id).order_by(models.RiskPrediction.created_at.desc()).first()
        if risk:
            extra_details["risk_score"] = risk.risk_probability
            extra_details["risk_level"] = risk.risk_level
            extra_details["weather_risk"] = risk.weather_contrib
            extra_details["port_congestion_risk"] = risk.congestion_contrib
            extra_details["geopolitical_risk"] = risk.geopolitical_contrib
            
        delay = db.query(models.DelayPrediction).filter(models.DelayPrediction.shipment_id == shipment.shipment_id).order_by(models.DelayPrediction.created_at.desc()).first()
        if delay:
            extra_details["predicted_delay"] = delay.predicted_delay_hours
            
        cost = db.query(models.CostPrediction).filter(models.CostPrediction.shipment_id == shipment.shipment_id).order_by(models.CostPrediction.created_at.desc()).first()
        if cost:
            extra_details["estimated_cost"] = cost.total_estimated_cost

    return {
        **vessel,
        **extra_details,
        "position_history": [
            {"lat": p.latitude, "lon": p.longitude, "speed": p.speed, "timestamp": p.timestamp.isoformat()}
            for p in positions
        ]
    }
