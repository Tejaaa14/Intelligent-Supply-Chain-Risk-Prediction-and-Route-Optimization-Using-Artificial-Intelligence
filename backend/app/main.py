import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.background import BackgroundScheduler
from dotenv import load_dotenv

load_dotenv()

from contextlib import asynccontextmanager
from app.database.database import engine, Base, SessionLocal
from app.api import vessels, weather, ports, news, routes, predictions, alerts, dashboard, health, whatif, audit, quantum, scenario
from app.services.simulation_service import SimulationEngine
from app.services.ais_service import ais_service_instance
from scripts.seed_demo_data import seed_data

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("[FastAPI] Initializing Database & Seed Data...")
    Base.metadata.create_all(bind=engine)
    seed_data()

    print("[FastAPI] Starting AIS Stream...")
    ais_service_instance.start_stream()

    print("[FastAPI] Starting Background Simulation Scheduler...")
    simulation_engine = SimulationEngine()
    
    def scheduled_tick():
        db = SessionLocal()
        try:
            simulation_engine.run_simulation_tick(db)
        except Exception as e:
            print(f"[Scheduler] Tick error: {e}")
        finally:
            db.close()

    scheduler.add_job(scheduled_tick, "interval", minutes=1, id="sim_tick")
    scheduler.start()
    
    yield
    
    print("[FastAPI] Shutting down...")
    scheduler.shutdown()

app = FastAPI(
    title="Intelligent Supply Chain Risk Prediction & Route Optimization Platform",
    description="Full-stack AI platform combining AIS telemetry, Open-Meteo weather, port congestion, fuel economics, geopolitical NLP, XGBoost/RandomForest risk models, NetworkX graph optimization, and SHAP XAI.",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for React Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(dashboard.router)
app.include_router(vessels.router)
app.include_router(weather.router)
app.include_router(ports.router)
app.include_router(news.router)
app.include_router(routes.router)
app.include_router(predictions.router)
app.include_router(alerts.router)
app.include_router(health.router)
app.include_router(whatif.router)
app.include_router(audit.router)
app.include_router(quantum.router)
app.include_router(scenario.router)


scheduler = BackgroundScheduler()



@app.get("/")
def root_status():
    return {
        "status": "ONLINE",
        "service": "Supply Chain Decision Intelligence Platform",
        "docs": "/docs",
        "version": "1.0.0"
    }
