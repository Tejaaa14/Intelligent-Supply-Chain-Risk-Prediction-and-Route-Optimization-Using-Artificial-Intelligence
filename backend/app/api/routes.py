from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database import database, crud
from app.optimization.route_optimizer import RouteOptimizer
from app.database import crud

router = APIRouter(prefix="/api/routes", tags=["Route Optimization"])
optimizer = RouteOptimizer()

class RouteOptimizeRequest(BaseModel):
    origin: str = "Shanghai"
    destination: str = "Singapore"
    vessel_id: str = "VESSEL_001"
    weights: dict = None

@router.post("/optimize")
def optimize_route_endpoint(req: RouteOptimizeRequest, db: Session = Depends(database.get_db)):
    vessel = crud.get_vessel(db, req.vessel_id)
    vessel_speed = vessel.speed if vessel else 18.4
    vessel_lat = vessel.current_latitude if vessel else None
    vessel_lon = vessel.current_longitude if vessel else None
    
    # Use vessel's origin info if available
    if vessel and vessel.destination and req.destination == "Singapore":
        # Use vessel's actual destination if the default was kept
        if vessel.destination != "N/A":
            req_destination = vessel.destination
        else:
            req_destination = req.destination
    else:
        req_destination = req.destination
    
    # Inject environmental disruptions for demo vessel (Ocean Star)
    disruptions = {}
    if req.vessel_id == "VESSEL_001" or (vessel and vessel.vessel_name == "Ocean Star"):
        disruptions = {
            "weather_bonus": 35.0,
            "congestion_bonus": 40.0,
            "geo_bonus": 30.0
        }

    res = optimizer.optimize_routes(
        origin=req.origin,
        destination=req_destination,
        vessel_speed=vessel_speed,
        weights=req.weights,
        live_disruptions=disruptions,
        vessel_lat=vessel_lat,
        vessel_lon=vessel_lon
    )

    # Get active shipment
    from app.database import models
    import uuid
    shipment = db.query(models.Shipment).filter(
        models.Shipment.vessel_id == req.vessel_id, 
        models.Shipment.status == "IN_TRANSIT"
    ).first()
    
    if not shipment:
        # Auto-create shipment for this vessel if it doesn't exist
        ship_id = f"SHIP_{uuid.uuid4().hex[:6].upper()}"
        shipment = models.Shipment(
            shipment_id=ship_id,
            vessel_id=req.vessel_id,
            origin=req.origin,
            destination=req.destination,
            status="IN_TRANSIT"
        )
        db.add(shipment)
        db.commit()
        db.refresh(shipment)

    # Rewrite route IDs to be unique and save to DB
    if shipment:
        # Clear old routes for this shipment
        db.query(models.RouteOption).filter(models.RouteOption.shipment_id == shipment.shipment_id).delete()
        
        for rt in res["candidate_routes"]:
            rt["route_id"] = f"{shipment.shipment_id}_{rt['route_id']}_{uuid.uuid4().hex[:4]}"
            if rt["route_name"] == res["recommended_route_name"]:
                res["recommended_route"] = rt["route_id"]
                
            db_route = models.RouteOption(
                route_id=rt["route_id"],
                shipment_id=shipment.shipment_id,
                route_name=rt["route_name"],
                origin=rt["origin"],
                destination=rt["destination"],
                waypoints_json=rt["waypoints"],
                distance_nautical_miles=rt["distance_nautical_miles"],
                travel_time_hours=rt["travel_time_hours"],
                fuel_cost=rt["estimated_total_cost"],
                weather_risk=rt["risk_score"], # approximation
                congestion_risk=0,
                geopolitical_risk=0,
                total_risk_score=rt["risk_score"],
                predicted_delay_hours=rt["predicted_delay_hours"],
                estimated_total_cost=rt["estimated_total_cost"],
                is_recommended=rt["is_recommended"]
            )
            db.add(db_route)
        db.commit()

    # Log audit event
    crud.log_audit(
        db=db,
        user="logistics_manager",
        request_action="ROUTE_OPTIMIZE",
        vessel_id=req.vessel_id,
        risk_score=res["risk_score"],
        recommended_route=res["recommended_route_name"],
        details=res["reason"]
    )

    return res

@router.get("/{shipment_id}")
def get_shipment_routes(shipment_id: str, db: Session = Depends(database.get_db)):
    shipment = crud.get_shipment(db, shipment_id)
    origin = shipment.origin if shipment else "Shanghai"
    dest = shipment.destination if shipment else "Singapore"
    v_id = shipment.vessel_id if shipment else "VESSEL_001"

    req = RouteOptimizeRequest(origin=origin, destination=dest, vessel_id=v_id)
    return optimize_route_endpoint(req, db)

@router.get("/network/global")
def get_global_route_network():
    graph = optimizer.graph
    nodes = []
    for n, data in graph.nodes(data=True):
        nodes.append({"id": n, "lat": data.get("lat"), "lon": data.get("lon"), "name": data.get("name")})
    
    edges = []
    for u, v, data in graph.edges(data=True):
        u_node = graph.nodes[u]
        v_node = graph.nodes[v]
        edges.append({
            "route_id": f"RT_{u}_{v}",
            "route_name": f"{u} to {v}",
            "origin": u,
            "destination": v,
            "distance_nautical_miles": data.get("distance"),
            "travel_time_hours": data.get("base_hours"),
            "risk_score": data.get("computed_risk", 20.0),
            "waypoints": [{"lat": u_node.get("lat"), "lon": u_node.get("lon")}] + data.get("waypoints", []) + [{"lat": v_node.get("lat"), "lon": v_node.get("lon")}]
        })
    return {"nodes": nodes, "routes": edges}

class AcceptRouteRequest(BaseModel):
    vessel_id: str
    route_id: str
    method: str = "QAOA Quantum Simulation"

@router.post("/accept")
def accept_route_endpoint(req: AcceptRouteRequest, db: Session = Depends(database.get_db)):
    # 1. Update Shipment
    from app.database import models
    shipment = db.query(models.Shipment).filter(
        models.Shipment.vessel_id == req.vessel_id, 
        models.Shipment.status == "IN_TRANSIT"
    ).first()
    
    if not shipment:
        raise HTTPException(status_code=404, detail="Active shipment not found")
        
    route = db.query(models.RouteOption).filter(models.RouteOption.route_id == req.route_id).first()
    if not route:
        raise HTTPException(status_code=404, detail="Route not found")
        
    previous_route_id = shipment.current_route_id
    shipment.current_route_id = req.route_id
    
    # 2. Resolve alerts for this vessel
    alerts = db.query(models.Alert).filter(
        models.Alert.vessel_id == req.vessel_id,
        models.Alert.is_resolved == False
    ).all()
    for a in alerts:
        a.is_resolved = True
    
    # Resolve vessel name for the log
    vessel = crud.get_vessel(db, req.vessel_id)
    vessel_name = vessel.vessel_name if vessel else req.vessel_id
    
    # Build detailed decision log
    detail_parts = [
        f"ACTION: Route accepted",
        f"METHOD: {req.method}",
        f"VESSEL: {vessel_name} ({req.vessel_id})",
        f"ROUTE: {route.route_name} ({req.route_id})",
        f"ORIGIN: {route.origin}",
        f"DESTINATION: {route.destination}",
        f"RISK SCORE: {route.total_risk_score}%",
        f"PREDICTED DELAY: {route.predicted_delay_hours}h",
        f"COST IMPACT: ${route.estimated_total_cost}",
    ]
    if previous_route_id:
        detail_parts.append(f"PREVIOUS ROUTE: {previous_route_id}")
        
    # 3. Log to AuditLog
    crud.log_audit(
        db=db,
        user="logistics_admin",
        request_action="ROUTE_ACCEPTED",
        vessel_id=req.vessel_id,
        risk_score=route.total_risk_score,
        recommended_route=route.route_name,
        details=" | ".join(detail_parts)
    )
    
    db.commit()
    return {"status": "Route accepted and alerts resolved"}
