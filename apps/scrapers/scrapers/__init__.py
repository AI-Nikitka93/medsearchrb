from apps.scrapers.scrapers.lighthouse import LighthouseScraper
from apps.scrapers.scrapers.medart import MedArtScraper
from apps.scrapers.scrapers.ydoc import YDocScraper

SCRAPER_REGISTRY = {
    "lighthouse": LighthouseScraper,
    "medart": MedArtScraper,
    "ydoc": YDocScraper,
}
