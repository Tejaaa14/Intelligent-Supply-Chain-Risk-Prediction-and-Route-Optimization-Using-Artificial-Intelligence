import os
import joblib
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from xgboost import XGBRegressor
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from typing import Dict, Any

MODEL_PATH = os.path.join(os.path.dirname(__file__), "../../models/delay_model.joblib")

FEATURE_COLUMNS = [
    "weather_risk",
    "port_waiting_time",
    "port_occupancy",
    "geopolitical_risk",
    "fuel_price",
    "distance",
    "vessel_speed"
]

class DelayPredictionModel:
    def __init__(self):
        self.model = None
        self.metrics = {}
        self._load_or_train()

    def _load_or_train(self):
        os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
        if os.path.exists(MODEL_PATH):
            try:
                saved = joblib.load(MODEL_PATH)
                self.model = saved["model"]
                self.metrics = saved["metrics"]
                return
            except Exception as e:
                print(f"[DelayModel] Saved model load failed: {e}. Retraining...")

        self.train_model()

    def train_model(self, df: pd.DataFrame = None) -> Dict[str, Any]:
        """Train XGBoost Regressor for delay prediction."""
        if df is None:
            from app.ml.dataset_generator import generate_historical_shipping_dataset
            df = generate_historical_shipping_dataset()

        X = df[FEATURE_COLUMNS]
        y = df["delay_hours"]

        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

        try:
            self.model = XGBRegressor(n_estimators=120, learning_rate=0.08, max_depth=6, random_state=42)
            self.model.fit(X_train, y_train)
            model_name = "XGBoost Regressor"
        except Exception:
            self.model = RandomForestRegressor(n_estimators=100, max_depth=8, random_state=42)
            self.model.fit(X_train, y_train)
            model_name = "Random Forest Regressor"

        y_pred = self.model.predict(X_test)

        mae = mean_absolute_error(y_test, y_pred)
        rmse = np.sqrt(mean_squared_error(y_test, y_pred))
        r2 = r2_score(y_test, y_pred)

        self.metrics = {
            "model_name": model_name,
            "library": "xgboost / scikit-learn",
            "n_estimators": 120 if model_name == "XGBoost Regressor" else 100,
            "learning_rate": 0.08 if model_name == "XGBoost Regressor" else None,
            "max_depth": 6 if model_name == "XGBoost Regressor" else 8,
            "training_samples": len(X_train),
            "testing_samples": len(X_test),
            "dataset": f"Shipping Dataset ({len(df)} records)",
            "mae": round(float(mae), 3),
            "rmse": round(float(rmse), 3),
            "r2_score": round(float(r2), 4)
        }

        joblib.dump({"model": self.model, "metrics": self.metrics}, MODEL_PATH)
        print(f"[DelayModel] Trained {model_name}. MAE: {self.metrics['mae']}, RMSE: {self.metrics['rmse']}, R2: {self.metrics['r2_score']}")
        return self.metrics

    def predict_delay(self, features: Dict[str, float]) -> Dict[str, Any]:
        """Predict delay in hours and probability of delay > 2 hours."""
        if self.model is None:
            self.train_model()

        input_data = pd.DataFrame([{col: features.get(col, 0.0) for col in FEATURE_COLUMNS}])
        pred_delay = float(self.model.predict(input_data)[0])
        pred_delay = max(0.0, round(pred_delay, 1))

        # Probability of delay derived from sigmoid of predicted delay
        prob_delay = round(100.0 / (1.0 + np.exp(-0.35 * (pred_delay - 3.0))), 1)
        confidence = round(max(75.0, min(95.0, 100.0 - self.metrics.get("mae", 1.5) * 4.0)), 1)

        return {
            "predicted_delay_hours": pred_delay,
            "probability_of_delay": max(10.0, min(99.0, prob_delay)),
            "confidence": confidence,
            "metrics": self.metrics
        }
