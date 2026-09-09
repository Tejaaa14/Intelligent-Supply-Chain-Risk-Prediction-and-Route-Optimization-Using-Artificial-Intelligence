import os
import datetime
import httpx
from typing import Dict, Any, List

class NewsService:
    """
    Geopolitical news service using GDELT DOC 2.0 API.
    
    GDELT is a near-real-time global news monitoring system. The DOC API
    supports full-text search and time-windowed news article retrieval.
    
    IMPORTANT: GDELT provides news articles, not authoritative geopolitical
    truth. Risk scores derived from GDELT data are DERIVED values produced
    by the application's NLP pipeline, not GDELT's own assessment.
    """
    def __init__(self):
        self.api_enabled = os.getenv("NEWS_ENABLED", "true").lower() == "true"
        self.gdelt_url = os.getenv("NEWS_API_URL", "https://api.gdeltproject.org/api/v2/doc/doc")
        self._cached_news = None
        self._last_fetch_time = None
        self.cache_ttl_seconds = 600  # 10 minutes refresh interval
        self._connection_status = "UNKNOWN"

    def get_data_source_mode(self) -> str:
        if not self.api_enabled:
            return "ERROR"
        if self._connection_status == "SUCCESS":
            return "LIVE"
        return "UNKNOWN"

    def get_connection_status(self) -> str:
        return self._connection_status

    def fetch_geopolitical_news(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Fetch live geopolitical disruption news from GDELT 2.0 DOC API."""
        now = datetime.datetime.utcnow()

        if self._cached_news and self._last_fetch_time:
            if (now - self._last_fetch_time).total_seconds() < self.cache_ttl_seconds:
                return self._cached_news

        if not self.api_enabled:
            self._connection_status = "ERROR"
            return []

        try:
            params = {
                "query": "maritime OR port OR strike OR typhoon OR blockade OR shipping OR canal",
                "mode": "artlist",
                "maxrecords": limit,
                "format": "json"
            }
            response = httpx.get(self.gdelt_url, params=params, timeout=6.0)
            if response.status_code == 200:
                data = response.json()
                articles = data.get("articles", [])
                if articles:
                    parsed = []
                    for art in articles:
                        parsed.append({
                            "headline": art.get("title", "Untitled Article"),
                            "description": f"Source domain: {art.get('domain', 'Unknown')}. Language: {art.get('language', 'English')}.",
                            "url": art.get("url", ""),
                            "source": art.get("domain", "GDELT Project"),
                            "published_time": art.get("seendate", now.isoformat()),
                            "source_country": art.get("sourcecountry", "Unknown"),
                            "data_source_mode": "LIVE",
                            "source_type": "LIVE",
                            "retrieved_at": now.isoformat(),
                            "data_lineage": {
                                "source": "GDELT DOC 2.0 API",
                                "endpoint": self.gdelt_url,
                                "source_type": "LIVE",
                                "status": "SUCCESS",
                                "retrieved_at": now.isoformat(),
                                "note": "Risk scores are DERIVED by application NLP pipeline, not by GDELT."
                            }
                        })
                    self._cached_news = parsed
                    self._last_fetch_time = now
                    self._connection_status = "SUCCESS"
                    return parsed
                else:
                    self._connection_status = "SUCCESS"
                    return []
        except Exception as e:
            print(f"[NewsService] GDELT live API call failed: {e}. Switching to ERROR mode.")
            self._connection_status = "ERROR"
        
        return []
