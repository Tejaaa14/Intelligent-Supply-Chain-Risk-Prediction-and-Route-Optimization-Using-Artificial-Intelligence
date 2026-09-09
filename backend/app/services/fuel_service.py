import os
import datetime
import httpx
from typing import Dict, Any, List

class FuelService:
    """
    Public Fuel Price Proxy using U.S. EIA Open Data API.
    
    EIA Series: petroleum/pri/spt/data (Petroleum Spot Prices)
    Product: WTI Crude Oil (not marine VLSFO bunker fuel)
    Conversion: Crude price ($/barrel) × 7.33 barrels/MT = approximate $/MT
    
    IMPORTANT: This is a PUBLIC ENERGY PRICE PROXY, not exact marine bunker fuel pricing.
    The conversion factor is an industry approximation. Actual VLSFO bunker prices
    vary by port, supplier, and market conditions.
    """
    EIA_SERIES_ID = "petroleum/pri/spt/data"
    EIA_PRODUCT = "WTI Crude Oil Spot Price"
    CONVERSION_FACTOR = 7.33  # barrels to metric tons (approximate)
    CONVERSION_NOTE = "Crude $/barrel × 7.33 bbl/MT = approximate $/MT for marine fuel proxy"

    def __init__(self):
        self.api_enabled = os.getenv("FUEL_PRICE_ENABLED", "true").lower() == "true"
        self.eia_url = os.getenv("FUEL_API_URL", "https://api.eia.gov/v2/petroleum/pri/spt/data")
        self.api_key = os.getenv("FUEL_API_KEY", "")
        self._cached_fuel = {}
        self.cache_ttl_seconds = 900  # 15 minutes refresh interval
        self._connection_status = "UNKNOWN"

    def get_data_source_mode(self) -> str:
        return "PUBLIC_PROXY" if self.api_enabled else "ERROR"

    def get_fuel_price(self, region: str = "Singapore") -> Dict[str, Any]:
        """Fetch energy price benchmark from U.S. EIA Open Data API."""
        now = datetime.datetime.utcnow()

        if region in self._cached_fuel:
            c_time, c_data = self._cached_fuel[region]
            if (now - c_time).total_seconds() < self.cache_ttl_seconds:
                return c_data

        if self.api_enabled and self.api_key:
            try:
                params = {"api_key": self.api_key, "frequency": "daily", "data[0]": "value"}
                response = httpx.get(self.eia_url, params=params, timeout=4.0)
                if response.status_code == 200:
                    eia_data = response.json()
                    raw_records = eia_data.get("response", {}).get("data", [])
                    raw_value = float(raw_records[0].get("value", 0)) if raw_records else 0.0
                    converted_price = round(raw_value * self.CONVERSION_FACTOR, 2)
                    eia_date = raw_records[0].get("period", now.strftime("%Y-%m-%d")) if raw_records else now.strftime("%Y-%m-%d")
                    self._connection_status = "SUCCESS"

                    res = {
                        "region": region,
                        "fuel_type": "Public Fuel Price Proxy",
                        "price": converted_price,
                        "raw_crude_price_per_barrel": raw_value,
                        "currency": "USD",
                        "unit": "$/MT (approximate)",
                        "source": "U.S. EIA Open Data API",
                        "fuel_price_source": "EIA",
                        "fuel_price_type": "PUBLIC_PROXY",
                        "fuel_price_note": f"EIA {self.EIA_PRODUCT} (${raw_value}/bbl) × {self.CONVERSION_FACTOR} bbl/MT conversion — used as public energy price proxy, not exact marine VLSFO bunker price.",
                        "eia_series_id": self.EIA_SERIES_ID,
                        "eia_product": self.EIA_PRODUCT,
                        "conversion_applied": self.CONVERSION_NOTE,
                        "data_source_mode": "PUBLIC_PROXY",
                        "source_type": "PUBLIC_DATA",
                        "source_status": "SUCCESS",
                        "retrieved_at": now.isoformat(),
                        "date": eia_date,
                        "data_lineage": {
                            "source": "U.S. EIA Open Data API",
                            "endpoint": self.eia_url,
                            "series": self.EIA_SERIES_ID,
                            "raw_value": raw_value,
                            "conversion": self.CONVERSION_NOTE,
                            "status": "SUCCESS",
                            "retrieved_at": now.isoformat()
                        }
                    }
                    self._cached_fuel[region] = (now, res)
                    return res
            except Exception as e:
                print(f"[FuelService] EIA API call failed: {e}.")
                self._connection_status = "ERROR"

        return self._error_response(region)

    def _error_response(self, region: str) -> Dict[str, Any]:
        """Return ERROR status if EIA API fails — no fake prices."""
        now = datetime.datetime.utcnow()
        self._connection_status = "ERROR"
        return {
            "region": region,
            "fuel_type": "N/A",
            "price": "N/A",
            "currency": "USD",
            "source": "U.S. EIA Open Data API — Unavailable",
            "fuel_price_source": "EIA",
            "fuel_price_type": "PUBLIC_PROXY",
            "data_source_mode": "ERROR",
            "source_type": "ERROR",
            "source_status": "ERROR",
            "retrieved_at": now.isoformat(),
            "date": now.strftime("%Y-%m-%d"),
            "data_lineage": {
                "source": "U.S. EIA Open Data API",
                "status": "ERROR",
                "retrieved_at": now.isoformat()
            }
        }

    def get_all_regional_prices(self) -> List[Dict[str, Any]]:
        regions = ["Singapore", "Rotterdam", "Fujairah", "Houston", "Shanghai"]
        return [self.get_fuel_price(region) for region in regions]
