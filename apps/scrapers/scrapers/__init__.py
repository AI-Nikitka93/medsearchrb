from apps.scrapers.scrapers.by103 import By103Scraper
from apps.scrapers.scrapers.doktora import DoktoraScraper
from apps.scrapers.scrapers.twodoc import TwoDocScraper
from apps.scrapers.scrapers.kravira import KraviraScraper
from apps.scrapers.scrapers.lighthouse import LighthouseScraper
from apps.scrapers.scrapers.lode import LodeScraper
from apps.scrapers.scrapers.medavenu import MedAvenuScraper
from apps.scrapers.scrapers.medart import MedArtScraper
from apps.scrapers.scrapers.nordin import NordinScraper
from apps.scrapers.scrapers.smartmedical import SmartMedicalScraper
from apps.scrapers.scrapers.supramed import SupraMedScraper
from apps.scrapers.scrapers.ydoc import YDocScraper

SCRAPER_REGISTRY = {
    "by103": By103Scraper,
    "doktora": DoktoraScraper,
    "2doc": TwoDocScraper,
    "kravira": KraviraScraper,
    "lighthouse": LighthouseScraper,
    "lode": LodeScraper,
    "medavenu": MedAvenuScraper,
    "medart": MedArtScraper,
    "nordin": NordinScraper,
    "smartmedical": SmartMedicalScraper,
    "supramed": SupraMedScraper,
    "ydoc": YDocScraper,
}
