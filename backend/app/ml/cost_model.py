from typing import Dict, Any

class CostEstimationModel:
    @staticmethod
    def calculate_cost(
        distance_nm: float,
        speed_knots: float,
        fuel_price_per_mt: float,
        predicted_delay_hours: float,
        port_waiting_hours: float = 12.0,
        container_teu: int = 15000
    ) -> Dict[str, Any]:
        """
        Estimate maritime transportation costs:
        Fuel Cost + Port Fees + Delay Penalties + Operational Expenses
        """
        speed_knots = max(10.0, speed_knots)
        travel_hours = distance_nm / speed_knots

        # Container ship fuel consumption: approx 35-50 Metric Tons per day at cruising speed
        daily_fuel_consumption_mt = 42.0 * ((speed_knots / 18.0) ** 3)
        total_fuel_mt = (travel_hours / 24.0) * daily_fuel_consumption_mt
        fuel_cost = round(total_fuel_mt * fuel_price_per_mt, 2)

        # Port cost: $1,200 per waiting hour berth fee
        port_cost = round(port_waiting_hours * 1200.0, 2)

        # Delay penalty cost: $850 per delayed hour (demurrage & supply chain SLA penalty)
        delay_cost = round(predicted_delay_hours * 850.0, 2)

        # Operational daily overhead: $15,000 / day
        operational_cost = round((travel_hours / 24.0) * 15000.0, 2)

        total_cost = round(fuel_cost + port_cost + delay_cost + operational_cost, 2)

        return {
            "fuel_cost": fuel_cost,
            "port_cost": port_cost,
            "delay_cost": delay_cost,
            "operational_cost": operational_cost,
            "total_estimated_cost": total_cost,
            "breakdown_percentages": {
                "fuel": round((fuel_cost / max(1.0, total_cost)) * 100, 1),
                "port": round((port_cost / max(1.0, total_cost)) * 100, 1),
                "delay": round((delay_cost / max(1.0, total_cost)) * 100, 1),
                "ops": round((operational_cost / max(1.0, total_cost)) * 100, 1)
            }
        }
