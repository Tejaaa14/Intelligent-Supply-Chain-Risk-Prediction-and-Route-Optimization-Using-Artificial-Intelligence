import pandas as pd
import numpy as np
import random
import datetime

def generate_historical_shipping_dataset(num_samples: int = 1200) -> pd.DataFrame:
    """
    Generates a realistic historical shipping dataset augmented with synthetic disruption scenarios.
    
    Target variables:
    - delay_hours (continuous)
    - risk_level (categorical: LOW, MEDIUM, HIGH, CRITICAL)
    """
    np.random.seed(42)
    random.seed(42)

    origins = ["Shanghai", "Hong Kong", "Singapore", "Rotterdam", "Los Angeles", "Dubai"]
    destinations = ["Singapore", "Rotterdam", "Los Angeles", "Hamburg", "Yokohama", "Antwerp"]
    
    data = []
    start_date = datetime.datetime(2025, 1, 1)

    for i in range(num_samples):
        orig = random.choice(origins)
        dest = random.choice([d for d in destinations if d != orig])
        distance_nm = random.uniform(1500, 11000)
        vessel_speed = random.uniform(15.0, 22.0)
        planned_hours = distance_nm / vessel_speed

        # Environmental & operational risk features
        weather_risk = np.clip(np.random.exponential(scale=20.0), 0, 100)
        port_waiting_time = max(0.0, np.random.normal(loc=12.0, scale=8.0))
        port_occupancy = np.clip(np.random.normal(loc=70.0, scale=15.0), 30, 98)
        fuel_price = np.random.normal(loc=630.0, scale=45.0)
        geopolitical_risk = np.clip(np.random.exponential(scale=15.0), 0, 100)
        
        # Synthetic Disruption Ground Truth Function (Deterministic + Noise)
        base_delay = (
            (weather_risk * 0.18) +
            (port_waiting_time * 0.85) +
            ((port_occupancy - 60) * 0.25 if port_occupancy > 60 else 0) +
            (geopolitical_risk * 0.15) +
            np.random.normal(0, 2.5)
        )
        delay_hours = round(max(0.0, base_delay), 2)

        # Categorize risk level
        if delay_hours < 4.0 and weather_risk < 30 and port_waiting_time < 12:
            risk_level = "LOW"
            risk_prob = random.uniform(5.0, 25.0)
        elif delay_hours < 12.0:
            risk_level = "MEDIUM"
            risk_prob = random.uniform(26.0, 55.0)
        elif delay_hours < 24.0:
            risk_level = "HIGH"
            risk_prob = random.uniform(56.0, 82.0)
        else:
            risk_level = "CRITICAL"
            risk_prob = random.uniform(83.0, 98.0)

        data.append({
            "shipment_id": f"HIST_{10000+i}",
            "vessel_id": f"VESSEL_{random.randint(1, 10):03d}",
            "origin": orig,
            "destination": dest,
            "distance": round(distance_nm, 1),
            "vessel_speed": round(vessel_speed, 1),
            "planned_hours": round(planned_hours, 1),
            "weather_risk": round(weather_risk, 1),
            "port_waiting_time": round(port_waiting_time, 1),
            "port_occupancy": round(port_occupancy, 1),
            "fuel_price": round(fuel_price, 2),
            "geopolitical_risk": round(geopolitical_risk, 1),
            "delay_hours": delay_hours,
            "risk_probability": round(risk_prob, 1),
            "risk_level": risk_level
        })

    df = pd.DataFrame(data)
    return df


def generate_dataset_summary() -> dict:
    """
    Return detailed metadata about the training dataset for transparency.
    This function is exposed via /api/model/dataset-info endpoint.
    """
    df = generate_historical_shipping_dataset()
    
    feature_columns = [
        "weather_risk", "port_waiting_time", "port_occupancy",
        "geopolitical_risk", "fuel_price", "distance", "vessel_speed"
    ]
    target_columns = ["delay_hours", "risk_level"]
    
    risk_distribution = df["risk_level"].value_counts().to_dict()
    
    train_size = int(len(df) * 0.8)
    test_size = len(df) - train_size
    
    return {
        "dataset_type": "SYNTHETIC_HISTORICAL",
        "dataset_note": (
            "Synthetically generated shipping dataset using realistic statistical distributions. "
            "This is NOT a collection of real vessel voyage records. The dataset simulates plausible "
            "maritime shipping scenarios for ML model training and academic evaluation purposes."
        ),
        "total_samples": len(df),
        "training_samples": train_size,
        "testing_samples": test_size,
        "train_test_split": "80/20 (stratified for classification)",
        "generation_seed": 42,
        "columns": list(df.columns),
        "feature_columns": feature_columns,
        "target_variables": target_columns,
        "risk_level_distribution": risk_distribution,
        "feature_descriptions": {
            "weather_risk": "Weather hazard level (0-100), exponential distribution, scale=20",
            "port_waiting_time": "Port queue waiting time in hours, normal distribution, μ=12, σ=8",
            "port_occupancy": "Port berth occupancy percentage, normal distribution, μ=70, σ=15",
            "geopolitical_risk": "Geopolitical disruption level (0-100), exponential distribution, scale=15",
            "fuel_price": "Fuel price in USD/MT, normal distribution, μ=630, σ=45",
            "distance": "Voyage distance in nautical miles, uniform distribution, 1500-11000",
            "vessel_speed": "Vessel speed in knots, uniform distribution, 15-22"
        },
        "target_descriptions": {
            "delay_hours": "Ground truth delay computed via: weather×0.18 + port_wait×0.85 + congestion_bonus + geo×0.15 + noise",
            "risk_level": "Categorized from delay_hours + weather + port thresholds: LOW/MEDIUM/HIGH/CRITICAL"
        },
        "generation_methodology": (
            "Each sample is generated independently with random features drawn from documented distributions. "
            "Delay hours are computed deterministically from features plus Gaussian noise (μ=0, σ=2.5). "
            "Risk level is derived from delay thresholds and feature values. "
            "Seed=42 ensures reproducibility."
        ),
        "origins": ["Shanghai", "Hong Kong", "Singapore", "Rotterdam", "Los Angeles", "Dubai"],
        "destinations": ["Singapore", "Rotterdam", "Los Angeles", "Hamburg", "Yokohama", "Antwerp"],
        "data_lineage": {
            "source": "dataset_generator.py",
            "source_type": "HISTORICAL",
            "note": "Synthetic dataset — not real shipping records."
        }
    }

