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
        destination=req.destination,
        vessel_speed=vessel_speed,
        weights=req.weights,
        live_disruptions=disruptions
    )

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
