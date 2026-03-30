from apps.scrapers.scrapers.aquaminsk import AquaMinskScraper
from apps.scrapers.scrapers.by103 import By103Scraper
from apps.scrapers.scrapers.centrsna import CentrSnaScraper
from apps.scrapers.scrapers.doctortut import DoctorTutScraper
from apps.scrapers.scrapers.doktora import DoktoraScraper
from apps.scrapers.scrapers.eclinic import EClinicScraper
from apps.scrapers.scrapers.forestmed import ForestMedScraper
from apps.scrapers.scrapers.gurumed import GuruMedScraper
from apps.scrapers.scrapers.happyderm import HappyDermScraper
from apps.scrapers.scrapers.idealmed import IdealMedScraper
from apps.scrapers.scrapers.kaskad import KaskadScraper
from apps.scrapers.scrapers.klinik import KlinikScraper
from apps.scrapers.scrapers.kravira import KraviraScraper
from apps.scrapers.scrapers.lighthouse import LighthouseScraper
from apps.scrapers.scrapers.lifecity import LifeCityScraper
from apps.scrapers.scrapers.lode import LodeScraper
from apps.scrapers.scrapers.medavenu import MedAvenuScraper
from apps.scrapers.scrapers.medart import MedArtScraper
from apps.scrapers.scrapers.medera import MederaScraper
from apps.scrapers.scrapers.mrtby import MrtByScraper
from apps.scrapers.scrapers.neomedical import NeoMedicalScraper
from apps.scrapers.scrapers.nordin import NordinScraper
from apps.scrapers.scrapers.paracels import ParacelsScraper
from apps.scrapers.scrapers.sante import SanteScraper
from apps.scrapers.scrapers.smartmedical import SmartMedicalScraper
from apps.scrapers.scrapers.supramed import SupraMedScraper
from apps.scrapers.scrapers.twodoc import TwoDocScraper
from apps.scrapers.scrapers.ydoc import YDocScraper

SCRAPER_REGISTRY = {
    "aquaminsk": AquaMinskScraper,
    "by103": By103Scraper,
    "centrsna": CentrSnaScraper,
    "doctortut": DoctorTutScraper,
    "doktora": DoktoraScraper,
    "eclinic": EClinicScraper,
    "forestmed": ForestMedScraper,
    "gurumed": GuruMedScraper,
    "happyderm": HappyDermScraper,
    "idealmed": IdealMedScraper,
    "kaskad": KaskadScraper,
    "klinik": KlinikScraper,
    "kravira": KraviraScraper,
    "lighthouse": LighthouseScraper,
    "lifecity": LifeCityScraper,
    "lode": LodeScraper,
    "medavenu": MedAvenuScraper,
    "medart": MedArtScraper,
    "medera": MederaScraper,
    "mrtby": MrtByScraper,
    "neomedical": NeoMedicalScraper,
    "nordin": NordinScraper,
    "paracels": ParacelsScraper,
    "sante": SanteScraper,
    "smartmedical": SmartMedicalScraper,
    "supramed": SupraMedScraper,
    "2doc": TwoDocScraper,
    "ydoc": YDocScraper,
}
