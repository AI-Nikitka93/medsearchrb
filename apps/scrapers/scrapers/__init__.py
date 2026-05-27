from apps.scrapers.scrapers.aquaminsk import AquaMinskScraper
from apps.scrapers.scrapers.alphamed import AlphaMedScraper
from apps.scrapers.scrapers.blossomclinic import BlossomClinicScraper
from apps.scrapers.scrapers.bullfinch import BullfinchScraper
from apps.scrapers.scrapers.by103 import By103Scraper
from apps.scrapers.scrapers.centrsna import CentrSnaScraper
from apps.scrapers.scrapers.dimeda import DimedaScraper
from apps.scrapers.scrapers.doctortut import DoctorTutScraper
from apps.scrapers.scrapers.doktora import DoktoraScraper
from apps.scrapers.scrapers.eclinic import EClinicScraper
from apps.scrapers.scrapers.eksana import EksanaScraper
from apps.scrapers.scrapers.ems import EmsScraper
from apps.scrapers.scrapers.forestmed import ForestMedScraper
from apps.scrapers.scrapers.gurumed import GuruMedScraper
from apps.scrapers.scrapers.happyderm import HappyDermScraper
from apps.scrapers.scrapers.idealmed import IdealMedScraper
from apps.scrapers.scrapers.imred import ImredScraper
from apps.scrapers.scrapers.kaskad import KaskadScraper
from apps.scrapers.scrapers.klinik import KlinikScraper
from apps.scrapers.scrapers.kravira import KraviraScraper
from apps.scrapers.scrapers.lighthouse import LighthouseScraper
from apps.scrapers.scrapers.lifecity import LifeCityScraper
from apps.scrapers.scrapers.lode import LodeScraper
from apps.scrapers.scrapers.makaenka17med import Makaenka17MedScraper
from apps.scrapers.scrapers.medavenu import MedAvenuScraper
from apps.scrapers.scrapers.medart import MedArtScraper
from apps.scrapers.scrapers.medera import MederaScraper
from apps.scrapers.scrapers.medexpert import MedExpertScraper
from apps.scrapers.scrapers.medicplus import MedicPlusScraper
from apps.scrapers.scrapers.medpraktika import MedPraktikaScraper
from apps.scrapers.scrapers.mercimed import MerciMedScraper
from apps.scrapers.scrapers.minskdentist import MinskDentistScraper
from apps.scrapers.scrapers.mrtby import MrtByScraper
from apps.scrapers.scrapers.neomedical import NeoMedicalScraper
from apps.scrapers.scrapers.nordin import NordinScraper
from apps.scrapers.scrapers.ortoclinic import OrtoClinicScraper
from apps.scrapers.scrapers.ortosmile import OrtoSmileScraper
from apps.scrapers.scrapers.paracels import ParacelsScraper
from apps.scrapers.scrapers.parodent import ParodentScraper
from apps.scrapers.scrapers.sante import SanteScraper
from apps.scrapers.scrapers.shineest import ShineEstScraper
from apps.scrapers.scrapers.smartmedical import SmartMedicalScraper
from apps.scrapers.scrapers.supramed import SupraMedScraper
from apps.scrapers.scrapers.superdent import SuperDentScraper
from apps.scrapers.scrapers.twodoc import TwoDocScraper
from apps.scrapers.scrapers.verba import VerbaScraper
from apps.scrapers.scrapers.ydoc import YDocScraper
from apps.scrapers.scrapers.zsmed import ZsMedScraper

SCRAPER_REGISTRY = {
    "alphamed": AlphaMedScraper,
    "aquaminsk": AquaMinskScraper,
    "blossomclinic": BlossomClinicScraper,
    "bullfinch": BullfinchScraper,
    "by103": By103Scraper,
    "centrsna": CentrSnaScraper,
    "dimeda": DimedaScraper,
    "doctortut": DoctorTutScraper,
    "doktora": DoktoraScraper,
    "eclinic": EClinicScraper,
    "eksana": EksanaScraper,
    "ems": EmsScraper,
    "forestmed": ForestMedScraper,
    "gurumed": GuruMedScraper,
    "happyderm": HappyDermScraper,
    "idealmed": IdealMedScraper,
    "imred": ImredScraper,
    "kaskad": KaskadScraper,
    "klinik": KlinikScraper,
    "kravira": KraviraScraper,
    "lighthouse": LighthouseScraper,
    "lifecity": LifeCityScraper,
    "lode": LodeScraper,
    "makaenka17med": Makaenka17MedScraper,
    "medavenu": MedAvenuScraper,
    "medart": MedArtScraper,
    "medera": MederaScraper,
    "medexpert": MedExpertScraper,
    "medicplus": MedicPlusScraper,
    "medpraktika": MedPraktikaScraper,
    "mercimed": MerciMedScraper,
    "minskdentist": MinskDentistScraper,
    "mrtby": MrtByScraper,
    "neomedical": NeoMedicalScraper,
    "nordin": NordinScraper,
    "ortoclinic": OrtoClinicScraper,
    "ortosmile": OrtoSmileScraper,
    "paracels": ParacelsScraper,
    "parodent": ParodentScraper,
    "sante": SanteScraper,
    "shineest": ShineEstScraper,
    "smartmedical": SmartMedicalScraper,
    "supramed": SupraMedScraper,
    "superdent": SuperDentScraper,
    "2doc": TwoDocScraper,
    "verba": VerbaScraper,
    "ydoc": YDocScraper,
    "zsmed": ZsMedScraper,
}
