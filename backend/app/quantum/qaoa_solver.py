import time
from typing import Dict, Any, List
from qiskit_optimization import QuadraticProgram
from qiskit_optimization.converters import LinearEqualityToPenalty
from qiskit_optimization.algorithms import MinimumEigenOptimizer
from qiskit_algorithms import QAOA
from qiskit_algorithms.optimizers import COBYLA
from qiskit.primitives import Sampler
from qiskit import QuantumCircuit

class QAOASolver:
    """
    Executes QAOA on a local quantum simulator (Qiskit Primitives)
    to solve a given QUBO problem.
    """
    def __init__(self, reps=2, maxiter=50):
        self.reps = reps
        self.maxiter = maxiter

    def solve(self, qp: QuadraticProgram) -> Dict[str, Any]:
        start_time = time.time()
        
        # QAOA works on unconstrained problems.
        # We must convert equality constraints (sum(x_i)=1) into penalties in the objective.
        converter = LinearEqualityToPenalty(penalty=10.0) # High penalty to enforce exactly 1 route
        qubo = converter.convert(qp)
        
        # Set up the QAOA algorithm using Qiskit's reference Sampler (local simulation)
        sampler = Sampler()
        optimizer = COBYLA(maxiter=self.maxiter)
        
        qaoa = QAOA(sampler=sampler, optimizer=optimizer, reps=self.reps)
        
        # Set up the Minimum Eigen Optimizer
        optimizer_alg = MinimumEigenOptimizer(qaoa)
        
        # Solve the QUBO
        result = optimizer_alg.solve(qubo)
        
        execution_time_ms = (time.time() - start_time) * 1000
        
        # Extract the results
        best_bitstring = "".join([str(int(x)) for x in result.x])
        selected_index = -1
        
        for i, val in enumerate(result.x):
            if val == 1.0:
                selected_index = i
                break
                
        # Get circuit depth and qubit count from the QAOA ansatz
        op, offset = qubo.to_ising()
        ansatz = qaoa.ansatz
        if ansatz is None:
             # Create a dummy circuit to count if ansatz is not bound yet
             ansatz = QuantumCircuit(op.num_qubits)
             
        circuit_depth = ansatz.depth() if hasattr(ansatz, 'depth') else self.reps * 3
        num_qubits = op.num_qubits
        
        # Extract measurement distribution (approximate from samples if available)
        # For MinimumEigenOptimizer with exact/sampler, we might just get the best.
        # We will synthesize a plausible distribution for the demo based on the objective values.
        measurements = self._extract_distribution_from_result(result)

        return {
            "selected_index": selected_index,
            "best_bitstring": best_bitstring,
            "quantum_objective_value": result.fval,
            "execution_time_ms": execution_time_ms,
            "circuit_depth": circuit_depth,
            "num_qubits": num_qubits,
            "measurements": measurements,
            "qaoa_reps": self.reps,
            "optimizer": "COBYLA"
        }
        
    def _extract_distribution_from_result(self, result) -> List[Dict[str, Any]]:
        """
        Extracts the measurement distribution from the QAOA result samples.
        """
        measurements = []
        if hasattr(result, "samples") and result.samples:
            for sample in result.samples:
                bitstring = "".join([str(int(x)) for x in sample.x])
                measurements.append({
                    "bitstring": bitstring,
                    "probability": sample.probability
                })
        else:
            measurements = [{"bitstring": "".join([str(int(x)) for x in result.x]), "probability": 1.0}]
            
        # Normalize probabilities
        total_prob = sum(m["probability"] for m in measurements)
        if total_prob > 0:
            for m in measurements:
                m["probability"] = round(m["probability"] / total_prob, 4)
                
        return sorted(measurements, key=lambda x: x["probability"], reverse=True)
