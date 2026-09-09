from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Dict, Any, Optional

from app.database import database, crud
from app.quantum.quantum_route_optimizer import QuantumRouteOptimizer
from app.services.scenario_service import scenario_service_instance

router = APIRouter(prefix="/api/quantum", tags=["Quantum Optimization"])

class OptimizeRequest(BaseModel):
    shipment_id: str
    origin: str
    destination: str
    vessel_speed: float = 18.0
    fuel_price: float = 630.0

def run_quantum_optimization_task(db: Session, req: OptimizeRequest):
    """Background task to run QAOA route optimization."""
    optimizer = QuantumRouteOptimizer(db)
    
    # Check if there are active scenarios modifying live disruptions
    active_scenarios = crud.get_active_scenarios(db)
    live_disruptions = {}
    for s in active_scenarios:
        if s.parameters:
            for k, v in s.parameters.items():
                live_disruptions[k] = live_disruptions.get(k, 0) + v
                
    # Also fetch from scenario service directly if it holds state
    svc_disruptions = scenario_service_instance.get_current_disruptions()
    for k, v in svc_disruptions.items():
         live_disruptions[k] = live_disruptions.get(k, 0) + v

    optimizer.optimize_vessel_route(
        shipment_id=req.shipment_id,
        origin=req.origin,
        destination=req.destination,
        vessel_speed=req.vessel_speed,
        fuel_price=req.fuel_price,
        live_disruptions=live_disruptions
    )

@router.post("/optimize")
def start_quantum_optimization(req: OptimizeRequest, background_tasks: BackgroundTasks, db: Session = Depends(database.get_db)):
    """Starts a quantum route optimization job in the background."""
    # We create the job record synchronously to return the ID immediately
    import uuid
    job_id = f"QJOB_{uuid.uuid4().hex[:8].upper()}"
    crud.create_quantum_job(db, {
        "job_id": job_id,
        "shipment_id": req.shipment_id,
        "status": "RUNNING",
        "configuration": {"algorithm": "QAOA", "reps": 2, "optimizer": "COBYLA"}
    })
    
    # Define a wrapper to update the job with the real execution
    def task_wrapper():
        db_local = database.SessionLocal()
        try:
            optimizer = QuantumRouteOptimizer(db_local)
            svc_disruptions = scenario_service_instance.get_current_disruptions()
            
            # The optimizer will create its own job ID inside if called directly,
            # so we monkey-patch or just let it create a new one and update the caller one to point to it.
            # Actually, let's just run it synchronously for the academic demo to ensure it completes fast.
        finally:
            db_local.close()

    # For the academic demo and to ensure the UI gets results quickly,
    # we'll execute it synchronously in the request thread if it's fast enough.
    # Qiskit QAOA on a 3-variable problem takes < 1 second.
    
    optimizer = QuantumRouteOptimizer(db)
    svc_disruptions = scenario_service_instance.get_current_disruptions()
    
    # We use the existing method which creates its own job ID, and we return that one
    real_job_id = optimizer.optimize_vessel_route(
        shipment_id=req.shipment_id,
        origin=req.origin,
        destination=req.destination,
        vessel_speed=req.vessel_speed,
        fuel_price=req.fuel_price,
        live_disruptions=svc_disruptions
    )
    
    return {"job_id": real_job_id, "status": "COMPLETED"}

@router.get("/status")
def get_quantum_status():
    """Returns the status of the local quantum simulator."""
    try:
        import qiskit
        import qiskit_aer
        return {
            "status": "READY",
            "backend": "qiskit_aer.AerSimulator",
            "qiskit_version": qiskit.__version__,
            "qiskit_aer_version": qiskit_aer.__version__,
            "message": "Local quantum simulator is ready for QAOA execution."
        }
    except ImportError:
        return {
            "status": "ERROR",
            "message": "Qiskit is not installed."
        }

@router.get("/results/{job_id}")
def get_job_results(job_id: str, db: Session = Depends(database.get_db)):
    job = crud.get_quantum_job(db, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
        
    return {
        "job_id": job.job_id,
        "shipment_id": job.shipment_id,
        "status": job.status,
        "configuration": job.configuration,
        "qubo_json": job.qubo_json,
        "candidate_routes": job.candidate_routes,
        "quantum_result": job.quantum_result,
        "classical_comparison": job.classical_comparison,
        "execution_time_ms": job.execution_time_ms,
        "timestamp": job.timestamp.isoformat() if job.timestamp else None
    }
    
@router.get("/circuit/{job_id}")
def get_job_circuit(job_id: str, db: Session = Depends(database.get_db)):
    """Returns a mock SVG or JSON representation of the QAOA circuit."""
    job = crud.get_quantum_job(db, job_id)
    if not job or job.status != "COMPLETED":
        raise HTTPException(status_code=404, detail="Job not found or not completed")
        
    num_qubits = job.quantum_result.get("num_qubits", 3)
    reps = job.configuration.get("reps", 2)
    
    # We build a representation of the circuit to render on the frontend
    layers = []
    
    # Initial state (Hadamards)
    h_layer = {"type": "Hadamard", "gates": [{"qubit": i, "name": "H"} for i in range(num_qubits)]}
    layers.append(h_layer)
    
    for r in range(reps):
        # Cost Hamiltonian layer
        cost_layer = {"type": f"Cost (gamma_{r})", "gates": [{"qubit": i, "name": "Rz"} for i in range(num_qubits)]}
        # Entanglement
        for i in range(num_qubits - 1):
            cost_layer["gates"].append({"qubit": [i, i+1], "name": "Rzz"})
        layers.append(cost_layer)
        
        # Mixer Hamiltonian layer
        mixer_layer = {"type": f"Mixer (beta_{r})", "gates": [{"qubit": i, "name": "Rx"} for i in range(num_qubits)]}
        layers.append(mixer_layer)
        
    # Measurement
    meas_layer = {"type": "Measurement", "gates": [{"qubit": i, "name": "M"} for i in range(num_qubits)]}
    layers.append(meas_layer)
    
    return {
        "job_id": job_id,
        "num_qubits": num_qubits,
        "depth": job.quantum_result.get("circuit_depth", reps * 3),
        "layers": layers
    }
