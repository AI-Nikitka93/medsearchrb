from apps.scrapers.scrapers.medart import MedArtScraper
from apps.scrapers.scrapers.ydoc import YDocScraper

SCRAPER_REGISTRY = {
    "medart": MedArtScraper,
    "ydoc": YDocScraper,
}
