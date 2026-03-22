from apps.scrapers.scrapers.kravira import KraviraScraper
from apps.scrapers.scrapers.lighthouse import LighthouseScraper
from apps.scrapers.scrapers.lode import LodeScraper
from apps.scrapers.scrapers.medart import MedArtScraper
from apps.scrapers.scrapers.ydoc import YDocScraper

SCRAPER_REGISTRY = {
    "kravira": KraviraScraper,
    "lighthouse": LighthouseScraper,
    "lode": LodeScraper,
    "medart": MedArtScraper,
    "ydoc": YDocScraper,
}
