import os
import joblib
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix
from typing import Dict, Any, Tuple

MODEL_PATH = os.path.join(os.path.dirname(__file__), "../../models/risk_model.joblib")

FEATURE_COLUMNS = [
    "weather_risk",
    "port_waiting_time",
    "port_occupancy",
    "geopolitical_risk",
    "fuel_price",
    "distance",
    "vessel_speed"
]

RISK_LEVEL_MAP = {0: "LOW", 1: "MEDIUM", 2: "HIGH", 3: "CRITICAL"}
REVERSE_LEVEL_MAP = {"LOW": 0, "MEDIUM": 1, "HIGH": 2, "CRITICAL": 3}

class RiskPredictionModel:
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
                print(f"[RiskModel] Saved model load failed: {e}. Retraining...")

        self.train_model()

    def train_model(self, df: pd.DataFrame = None) -> Dict[str, Any]:
        """Train Random Forest Classifier for risk level prediction."""
        if df is None:
            from app.ml.dataset_generator import generate_historical_shipping_dataset
            df = generate_historical_shipping_dataset()

        X = df[FEATURE_COLUMNS]
        y = df["risk_level"].map(REVERSE_LEVEL_MAP)

        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

        self.model = RandomForestClassifier(n_estimators=100, max_depth=10, random_state=42)
        self.model.fit(X_train, y_train)

        y_pred = self.model.predict(X_test)

        self.metrics = {
            "model_name": "RandomForest Classifier",
            "library": "scikit-learn",
            "n_estimators": 100,
            "max_depth": 10,
            "training_samples": len(X_train),
            "testing_samples": len(X_test),
            "dataset": f"Shipping Dataset ({len(df)} records)",
            "accuracy": round(float(accuracy_score(y_test, y_pred)), 4),
            "precision": round(float(precision_score(y_test, y_pred, average="weighted")), 4),
            "recall": round(float(recall_score(y_test, y_pred, average="weighted")), 4),
            "f1_score": round(float(f1_score(y_test, y_pred, average="weighted")), 4),
            "confusion_matrix": confusion_matrix(y_test, y_pred).tolist()
        }

        joblib.dump({"model": self.model, "metrics": self.metrics}, MODEL_PATH)
        print(f"[RiskModel] Training Complete. Accuracy: {self.metrics['accuracy']}, F1: {self.metrics['f1_score']}")
        return self.metrics

    def predict_risk(self, features: Dict[str, float]) -> Dict[str, Any]:
        """Predict risk level and continuous risk probability percentage."""
        if self.model is None:
            self.train_model()

        input_data = pd.DataFrame([{col: features.get(col, 0.0) for col in FEATURE_COLUMNS}])
        probs = self.model.predict_proba(input_data)[0]
        pred_class = int(np.argmax(probs))
        risk_level = RISK_LEVEL_MAP[pred_class]

        # Calculate weighted probability score (0 to 100)
        risk_prob = round(float((probs[1] * 0.35 + probs[2] * 0.70 + probs[3] * 1.0) * 100), 1)
        confidence = round(float(np.max(probs) * 100), 1)

        # Factor contributions for XAI fallback
        weather = features.get("weather_risk", 0.0)
        congestion = features.get("port_waiting_time", 0.0) * 4.0
        geopolitical = features.get("geopolitical_risk", 0.0)
        total_factors = max(1.0, weather + congestion + geopolitical)

        return {
            "risk_probability": max(5.0, min(98.0, risk_prob)),
            "risk_level": risk_level,
            "confidence": max(60.0, min(99.0, confidence)),
            "feature_contributions": {
                "weather": round((weather / total_factors) * 100, 1),
                "port_congestion": round((congestion / total_factors) * 100, 1),
                "geopolitical": round((geopolitical / total_factors) * 100, 1)
            }
        }
