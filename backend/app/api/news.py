from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import database
from app.services.news_service import NewsService
from app.ml.nlp_pipeline import GeopoliticalNLPPipeline

router = APIRouter(prefix="/api/news", tags=["News"])
news_service = NewsService()
nlp_pipeline = GeopoliticalNLPPipeline()

@router.get("")
def get_geopolitical_news(db: Session = Depends(database.get_db)):
    raw_news = news_service.fetch_geopolitical_news(limit=10)
    parsed_results = []
    for item in raw_news:
        parsed = nlp_pipeline.process_text(item["headline"], item.get("description", ""))
        parsed["source"] = item.get("source", "Maritime Intel")
        parsed["published_time"] = item.get("published_time")
        parsed["data_source_mode"] = item.get("data_source_mode", "SIMULATED")
        parsed_results.append(parsed)
    return parsed_results

@router.get("/risk")
def get_high_risk_events(db: Session = Depends(database.get_db)):
    all_news = get_geopolitical_news(db)
    return [n for n in all_news if n["risk_score"] >= 65.0]
