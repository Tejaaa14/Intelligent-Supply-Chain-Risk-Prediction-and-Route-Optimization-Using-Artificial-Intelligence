import numpy as np
from typing import List, Dict, Any
from qiskit_optimization import QuadraticProgram

class QUBOBuilder:
    """
    Constructs a Quadratic Unconstrained Binary Optimization (QUBO) formulation
    for the route selection problem.
    """
    def __init__(self, alpha=0.35, beta=0.35, gamma=0.20, delta=0.10):
        # Weights for the objective function
        self.alpha = alpha  # Risk
        self.beta = beta    # Cost
        self.gamma = gamma  # Delay
        self.delta = delta  # Distance

    def build_qubo_from_candidates(self, candidate_routes: List[Dict[str, Any]]) -> QuadraticProgram:
        """
        Since solving the full graph with QAOA requires many qubits (one per edge),
        we use a candidate-route reduction method for the academic demo.
        We define binary variables x_i where x_i = 1 means candidate route i is selected.
        Constraint: Exactly one route must be selected (sum(x_i) == 1).
        Objective: Minimize sum(c_i * x_i) + penalty * (sum(x_i) - 1)^2
        """
        qp = QuadraticProgram("Route_Optimization_QUBO")
        
        n_routes = len(candidate_routes)
        
        # Define binary variables
        for i in range(n_routes):
            qp.binary_var(name=f"x_{i}")
            
        # Calculate objective coefficients for each route
        linear_coeffs = {}
        
        for i, route in enumerate(candidate_routes):
            # Normalize metrics roughly to 0-1 range for the Hamiltonian
            risk_norm = route.get("risk_score", 0) / 100.0
            cost_norm = route.get("estimated_total_cost", 0) / 500000.0
            delay_norm = route.get("predicted_delay_hours", 0) / 48.0
            dist_norm = route.get("distance_nautical_miles", 0) / 10000.0
            
            c_i = (self.alpha * risk_norm + 
                   self.beta * cost_norm + 
                   self.gamma * delay_norm + 
                   self.delta * dist_norm)
                   
            linear_coeffs[f"x_{i}"] = c_i

        # Add the linear terms to the objective
        qp.minimize(linear=linear_coeffs)
        
        # Add constraint: exactly one route must be selected
        # sum(x_i) == 1
        constraint_linear = {f"x_{i}": 1 for i in range(n_routes)}
        qp.linear_constraint(linear=constraint_linear, sense="==", rhs=1, name="single_route_selection")
        
        return qp
