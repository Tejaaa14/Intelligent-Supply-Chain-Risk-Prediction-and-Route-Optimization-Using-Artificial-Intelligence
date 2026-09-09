import sys
import os
import datetime
import random
import uuid

# Add backend directory to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database.database import engine, Base, SessionLocal
from app.database import models, crud

def seed_data():
    print("[SeedScript] Recreating database tables...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # Clear existing demo entries for clean initialization
    db.query(models.Vessel).delete()
    db.query(models.Port).delete()
    db.query(models.Shipment).delete()
    db.query(models.Alert).delete()
    db.query(models.NewsEvent).delete()
    db.commit()

    print("[SeedScript] Seeding Vessels...")
    vessels = []
    vessel_types = ["Container", "Bulk", "Tanker", "Cargo", "Passenger"]
    statuses = ["UNDERWAY", "ANCHORED", "MOORED", "WAITING", "DELAYED"]
    modes = ["SIMULATED", "LIVE"]
    destinations = ["Singapore", "Rotterdam", "Los Angeles", "Shanghai", "Hong Kong", "Jebel Ali", "Suez", "Panama", "Hamburg"]

    # Original core vessels
    vessels.extend([
        {
            "vessel_id": "VESSEL_001",
            "imo_number": "IMO9876543",
            "vessel_name": "Ocean Star",
            "vessel_type": "Container",
            "capacity_teu": 20000,
            "current_latitude": 17.3850,
            "current_longitude": 113.4860,
            "speed": 18.4,
            "heading": 210.0,
            "course": 210.0,
            "destination": "Singapore",
            "eta": (datetime.datetime.utcnow() + datetime.timedelta(days=2)).isoformat(),
            "status": "UNDERWAY",
            "data_source_mode": "LIVE"
        },
        {
            "vessel_id": "VESSEL_002",
            "imo_number": "IMO9123456",
            "vessel_name": "Pacific Voyager",
            "vessel_type": "Container",
            "capacity_teu": 14000,
            "current_latitude": 28.5000,
            "current_longitude": -150.2000,
            "speed": 19.1,
            "heading": 260.0,
            "course": 260.0,
            "destination": "Hong Kong",
            "eta": (datetime.datetime.utcnow() + datetime.timedelta(days=5)).isoformat(),
            "status": "UNDERWAY",
            "data_source_mode": "SIMULATED"
        }
    ])

    # Generate 250 dummy vessels around the globe
    for i in range(3, 253):
        v_type = random.choice(vessel_types)
        status = random.choice(statuses)
        mode = random.choice(modes)
        # Random global coords (mostly oceans)
        lat = random.uniform(-60.0, 70.0)
        lon = random.uniform(-180.0, 180.0)
        speed = random.uniform(5.0, 25.0) if status in ["UNDERWAY", "DELAYED"] else 0.0
        heading = random.uniform(0.0, 360.0)

        vessels.append({
            "vessel_id": f"VESSEL_{i:03d}",
            "imo_number": f"IMO{random.randint(1000000, 9999999)}",
            "vessel_name": f"Global {v_type} {i}",
            "vessel_type": v_type,
            "capacity_teu": random.randint(1000, 24000),
            "current_latitude": lat,
            "current_longitude": lon,
            "speed": speed,
            "heading": heading,
            "course": heading,
            "destination": random.choice(destinations),
            "eta": (datetime.datetime.utcnow() + datetime.timedelta(days=random.randint(1, 14))).isoformat() if status in ["UNDERWAY", "DELAYED"] else None,
            "status": status,
            "data_source_mode": mode
        })

    for v in vessels:
        crud.create_or_update_vessel(db, v)

    print("[SeedScript] Seeding Ports...")
    from app.services.port_service import PortService
    ps = PortService()
    for p in ps.get_all_ports():
        crud.create_or_update_port(db, p)

    print("[SeedScript] Seeding Shipments...")
    shipments = [
        {
            "shipment_id": "SHIP_001",
            "vessel_id": "VESSEL_001",
            "cargo_description": "Consumer Electronics & Automotive Components",
            "origin": "Shanghai",
            "destination": "Singapore",
            "planned_departure": datetime.datetime.utcnow() - datetime.timedelta(days=2),
            "planned_eta": datetime.datetime.utcnow() + datetime.timedelta(days=2),
            "status": "IN_TRANSIT"
        },
        {
            "shipment_id": "SHIP_002",
            "vessel_id": "VESSEL_002",
            "cargo_description": "Industrial Machinery",
            "origin": "Los Angeles",
            "destination": "Hong Kong",
            "planned_departure": datetime.datetime.utcnow() - datetime.timedelta(days=4),
            "planned_eta": datetime.datetime.utcnow() + datetime.timedelta(days=5),
            "status": "IN_TRANSIT"
        }
    ]
    for s in shipments:
        db.add(models.Shipment(**s))
    db.commit()

    print("[SeedScript] Seeding Geopolitical Events...")
    events = [
        {
            "headline": "Dockworker Strike in Rotterdam",
            "description": "Port operations severely affected by sudden strike.",
            "source": "GDELT",
            "published_time": datetime.datetime.utcnow() - datetime.timedelta(hours=2),
            "event_type": "STRIKE",
            "sentiment": -0.8,
            "risk_score": 85.0,
            "latitude": 51.9225,
            "longitude": 4.47917,
            "data_source_mode": "LIVE"
        },
        {
            "headline": "Naval Blockade Exercise in South China Sea",
            "description": "Military exercises causing rerouting of commercial vessels.",
            "source": "GDELT",
            "published_time": datetime.datetime.utcnow() - datetime.timedelta(hours=12),
            "event_type": "CONFLICT",
            "sentiment": -0.9,
            "risk_score": 95.0,
            "latitude": 15.0,
            "longitude": 115.0,
            "data_source_mode": "LIVE"
        },
        {
            "headline": "Suez Canal Temporary Closure",
            "description": "Sandstorm limits visibility causing temporary halt of convoys.",
            "source": "GDELT",
            "published_time": datetime.datetime.utcnow() - datetime.timedelta(hours=5),
            "event_type": "WEATHER",
            "sentiment": -0.6,
            "risk_score": 75.0,
            "latitude": 30.5852,
            "longitude": 32.2654,
            "data_source_mode": "LIVE"
        }
    ]
    for ev in events:
        news = models.NewsEvent(**ev)
        db.add(news)
    db.commit()

    print("[SeedScript] Seeding Disruption Alerts...")
    alerts = [
        {
            "alert_id": "ALT_1001",
            "shipment_id": "SHIP_001",
            "vessel_id": "VESSEL_001",
            "alert_type": "HIGH_RISK",
            "severity": "CRITICAL",
            "title": "CRITICAL REROUTE ALERT: Ocean Star (Shanghai -> Singapore)",
            "description": "Vessel Ocean Star on Route A is encountering severe typhoon winds (45 knots) combined with 18.5-hour berth waiting times at Port of Singapore and active dockworker strikes.",
            "recommended_action": "Switch to Route B (Lombok Bypass). Saves 10.0 hours expected delay and reduces disruption risk from 84% to 34%."
        },
        {
            "alert_id": "ALT_1002",
            "shipment_id": "SHIP_002",
            "vessel_id": "VESSEL_002",
            "alert_type": "WEATHER",
            "severity": "INFO",
            "title": "Moderate Weather Warning: Pacific Voyager",
            "description": "22-knot winds detected along mid-pacific transit corridor. Route remains on schedule.",
            "recommended_action": "Maintain current speed and trajectory."
        }
    ]
    for a in alerts:
        crud.create_alert(db, a)

    print("[SeedScript] Seeding complete successfully!")
    db.close()

if __name__ == "__main__":
    seed_data()
