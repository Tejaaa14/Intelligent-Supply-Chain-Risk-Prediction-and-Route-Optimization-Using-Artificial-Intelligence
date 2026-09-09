import shap
import pandas as pd
import numpy as np
from typing import Dict, Any, List

class ExplainableAIModule:
    def __init__(self, risk_model_obj=None, delay_model_obj=None):
        self.risk_model_obj = risk_model_obj
        self.delay_model_obj = delay_model_obj

    def explain_prediction(self, features: Dict[str, float]) -> Dict[str, Any]:
        """
        Generate actual SHAP feature attributions and natural language decision reasoning.
        """
        feature_cols = ["weather_risk", "port_waiting_time", "port_occupancy", "geopolitical_risk", "fuel_price", "distance", "vessel_speed"]
        input_df = pd.DataFrame([{col: features.get(col, 0.0) for col in feature_cols}])
        
        shap_values_dict = {}
        top_drivers = []
        
        if self.risk_model_obj and getattr(self.risk_model_obj, "model", None) is not None:
            try:
                explainer = shap.TreeExplainer(self.risk_model_obj.model)
                shap_vals = explainer.shap_values(input_df)
                
                # For classification, shap_vals is usually a list. Get the max class index predicted.
                probs = self.risk_model_obj.model.predict_proba(input_df)[0]
                pred_class = int(np.argmax(probs))
                
                if isinstance(shap_vals, list):
                    vals = shap_vals[pred_class][0]
                elif isinstance(shap_vals, np.ndarray) and len(shap_vals.shape) == 3:
                    vals = shap_vals[0, :, pred_class]
                else:
                    vals = shap_vals[0]
                
                total_abs_shap = sum(abs(v) for v in vals) if sum(abs(v) for v in vals) > 0 else 1.0
                
                for col, val in zip(feature_cols, vals):
                    impact = "Positive" if val > 0 else "Negative"
                    relative = round((abs(val) / total_abs_shap) * 100, 1)
                    shap_values_dict[col] = {
                        "shap_value": round(float(val), 4),
                        "impact": impact,
                        "relative_contribution_percent": relative,
                        "feature_value": features.get(col, 0.0)
                    }
                    
                # Sort top drivers by absolute SHAP value
                sorted_features = sorted(
                    [(col, shap_values_dict[col]) for col in feature_cols],
                    key=lambda x: abs(x[1]["shap_value"]),
                    reverse=True
                )
                
                for col, details in sorted_features[:5]:
                    top_drivers.append({
                        "factor": col.replace("_", " ").title(),
                        "shap_value": details["shap_value"],
                        "impact": details["impact"],
                        "relative_contribution": details["relative_contribution_percent"],
                        "impact_percentage": details["relative_contribution_percent"]
                    })
                    
            except Exception as e:
                print(f"[XAI] SHAP computation failed: {e}")

        if not top_drivers:
            return {
                "shap_feature_importance": {},
                "top_risk_drivers": [],
                "natural_language_explanation": "Explainability unavailable. SHAP model could not process the request."
            }

        # Build natural language narrative based on actual top factors
        primary = top_drivers[0]
        secondary = top_drivers[1] if len(top_drivers) > 1 else None
        
        narrative = f"The risk prediction is primarily driven by {primary['factor']}, which had a {primary['impact'].lower()} impact on the risk level given its SHAP contribution. "
        if secondary:
            narrative += f"The secondary contributor is {secondary['factor']}, also having a {secondary['impact'].lower()} impact."

        return {
            "shap_feature_importance": shap_values_dict,
            "top_risk_drivers": top_drivers,
            "natural_language_explanation": narrative
        }
