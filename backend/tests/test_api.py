import sys
import os
from fastapi.testclient import TestClient

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app

client = TestClient(app)

def test_health():
    res = client.get("/")
    assert res.status_code == 200
    assert res.json()["status"] == "ONLINE"

def test_vessels():
    res = client.get("/api/vessels")
    assert res.status_code == 200
    assert isinstance(res.json(), list)

def test_vessel_details():
    res = client.get("/api/vessels/VESSEL_001")
    assert res.status_code == 200
    assert res.json()["vessel_name"] == "Ocean Star"

def test_ports():
    res = client.get("/api/ports")
    assert res.status_code == 200
    assert len(res.json()) >= 5

def test_weather():
    res = client.get("/api/weather/VESSEL_001")
    assert res.status_code == 200
    assert "weather_risk_score" in res.json()

def test_news():
    res = client.get("/api/news")
    assert res.status_code == 200
    assert isinstance(res.json(), list)

def test_route_optimization():
    payload = {"origin": "Shanghai", "destination": "Singapore", "vessel_id": "VESSEL_001"}
    res = client.post("/api/routes/optimize", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "recommended_route" in data
    assert len(data["candidate_routes"]) >= 2

def test_predictions():
    r_res = client.get("/api/risk/SHIP_001")
    assert r_res.status_code == 200
    assert r_res.json()["risk_level"] in ["LOW", "MEDIUM", "HIGH", "CRITICAL"]

    d_res = client.get("/api/delay/SHIP_001")
    assert d_res.status_code == 200
    assert d_res.json()["predicted_delay_hours"] >= 0.0

    c_res = client.get("/api/cost/SHIP_001")
    assert c_res.status_code == 200
    assert c_res.json()["total_estimated_cost"] > 0.0

def test_explanations():
    ex_res = client.get("/api/explanations/SHIP_001")
    assert ex_res.status_code == 200
    assert "natural_language_explanation" in ex_res.json()

def test_dashboard_summary():
    dash = client.get("/api/dashboard/summary")
    assert dash.status_code == 200
    assert dash.json()["total_active_vessels"] >= 3

def test_model_metrics():
    metrics = client.get("/api/model/metrics")
    assert metrics.status_code == 200
    assert "risk_classification_model" in metrics.json()
    assert "delay_prediction_model" in metrics.json()

def test_auth_flow():
    # 1. Test /me unauthenticated
    unauth_res = client.get("/api/auth/me")
    assert unauth_res.status_code == 401

    # 2. Test login with admin
    login_res = client.post("/api/auth/login", json={"username": "admin", "password": "password123"})
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    assert token is not None
    assert login_res.json()["user"]["role"] == "ADMIN"

    # 3. Test /me authenticated
    me_res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    assert me_res.json()["username"] == "Admin User"
    assert me_res.json()["role"] == "ADMIN"

    # 4. Test logout
    logout_res = client.post("/api/auth/logout", headers={"Authorization": f"Bearer {token}"})
    assert logout_res.status_code == 200

    # 5. Test /me after logout (should be revoked)
    revoked_res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert revoked_res.status_code == 401

