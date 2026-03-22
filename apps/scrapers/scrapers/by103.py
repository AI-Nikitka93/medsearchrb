from __future__ import annotations

import gzip
import re
import xml.etree.ElementTree as ET
from urllib.parse import urlparse

from apps.scrapers.models import (
    ClinicRecord,
    DoctorClinicLinkRecord,
    DoctorRecord,
    ReviewSummaryRecord,
)
from apps.scrapers.scrapers.base import BaseScraper


SITEMAP_NS = {"s": "http://www.sitemaps.org/schemas/sitemap/0.9"}


class By103Scraper(BaseScraper):
    source_name = "103.by"
    base_url = "https://www.103.by"
    allowed_seed_urls = (
        "https://www.103.by/spec/25-vecer/",
        "https://www.103.by/sitemap-staff.xml.gz",
    )

    def collect(self):
        batch = self.empty_batch()
        clinic_map: dict[str, ClinicRecord] = {}

        for doctor_url in self.trim_doctor_urls(self._collect_doctor_urls()):
            if batch.doctors:
                self.polite_sleep()

            doctor, review, clinics = self._extract_doctor(doctor_url)
            if not doctor or not review:
                continue

            batch.doctors.append(doctor)
            batch.review_summaries.append(review)
            for clinic in clinics:
                clinic_map[clinic.external_id] = clinic

        batch.clinics.extend(clinic_map.values())
        return batch

    def _collect_doctor_urls(self) -> list[str]:
        response = self.client.get_text(self.absolute_url("/sitemap-staff.xml.gz"), referer=self.base_url)
        raw_xml = gzip.decompress(response.content).decode("utf-8", "ignore")
        root = ET.fromstring(raw_xml)
        urls: list[str] = []
        for loc in root.findall("s:url/s:loc", SITEMAP_NS):
            if not loc.text:
                continue
            url = loc.text.strip()
            if "/spec/" not in url:
                continue
            if re.search(r"/spec//?$", url):
                continue
            urls.append(url)
        unique_urls = self.unique_urls(urls)
        return self.slice_urls_with_env(
            unique_urls,
            offset_env="BY103_URL_OFFSET",
            limit_env="BY103_URL_LIMIT",
        )

    def _extract_doctor(
        self,
        doctor_url: str,
    ) -> tuple[DoctorRecord | None, ReviewSummaryRecord | None, list[ClinicRecord]]:
        response = self.client.get_text(doctor_url, referer=self.base_url)
        soup = self.soup(response.text)

        title = soup.title.get_text(" ", strip=True) if soup.title else ""
        if "Минск" not in title and "Минске" not in title:
            return None, None, []

        full_name = self.normalize_space(soup.find("h1").get_text(" ", strip=True) if soup.find("h1") else "")
        if not full_name:
            return None, None, []

        rating_value = self._extract_meta_number(soup, "ratingValue")
        review_count = int(self._extract_meta_number(soup, "reviewCount") or 0)
        specialty_name = self._extract_specialty_name(title)
        clinics = self._extract_clinics(soup)

        external_id = self._doctor_external_id(response.url)
        clinic_links = [
            DoctorClinicLinkRecord(
                clinic_external_id=clinic.external_id,
                relation_source_url=response.url,
                booking_url=response.url,
                profile_url=response.url,
                aggregator_booking_url=response.url,
                aggregator_profile_url=response.url,
                source_type="aggregator",
                verification_status="aggregator_only",
                verified_on_clinic_site=False,
                confidence_score=0.5,
            )
            for clinic in clinics
        ]
        doctor = DoctorRecord(
            source=self.source_name,
            external_id=external_id,
            full_name=full_name,
            url=response.url,
            booking_url=response.url,
            profile_url=response.url,
            source_type="aggregator",
            verification_status="aggregator_only",
            verified_on_clinic_site=False,
            confidence_score=0.5,
            specialty_names=[specialty_name] if specialty_name else ["Не указано"],
            clinic_external_ids=[clinic.external_id for clinic in clinics],
            clinic_links=clinic_links,
            source_url=response.url,
        )
        review = ReviewSummaryRecord(
            source=self.source_name,
            subject_type="doctor",
            subject_external_id=external_id,
            rating_value=rating_value,
            review_count=review_count,
            url=response.url,
            source_url=response.url,
        )
        return doctor, review, clinics

    def _extract_meta_number(self, soup, prop: str) -> float | None:
        node = soup.select_one(f"[itemprop='{prop}'][content]")
        if not node:
            return None
        raw = self.normalize_space(node.get("content", "")).replace(",", ".")
        match = re.search(r"(\d+(?:\.\d+)?)", raw)
        return float(match.group(1)) if match else None

    def _extract_specialty_name(self, title: str) -> str | None:
        match = re.search(r":\s*отзывы,\s*(.+?)\s*-\s*запись", title, re.IGNORECASE)
        if not match:
            return None
        return self.normalize_space(match.group(1))

    def _extract_clinics(self, soup) -> list[ClinicRecord]:
        clinics: dict[str, ClinicRecord] = {}
        for block in soup.select(".StaffPage__Place"):
            name_link = None
            for link in block.select("a[href]"):
                text = self.normalize_space(link.get_text(" ", strip=True))
                href = link.get("href", "")
                if not text or "отзыв" in text.lower():
                    continue
                if "103.by" in href.lower():
                    name_link = link
                    break

            if not name_link or not name_link.get("href"):
                continue

            clinic_url = name_link["href"]
            clinic_name = self.normalize_space(name_link.get_text(" ", strip=True))
            address_node = block.select_one(".StaffPage__PlaceAddress")
            address = self.normalize_space(address_node.get_text(" ", strip=True) if address_node else "")
            if not clinic_name:
                continue

            external_id = self._clinic_external_id(clinic_url, clinic_name, address)
            clinics[external_id] = ClinicRecord(
                source=self.source_name,
                external_id=external_id,
                name=clinic_name,
                url=clinic_url,
                address=address or None,
                source_type="aggregator",
                is_official=False,
                source_priority=100,
                verification_status="aggregator_only",
                source_url=clinic_url,
            )

        return list(clinics.values())

    def _clinic_external_id(self, clinic_url: str, clinic_name: str, address: str) -> str:
        parsed = urlparse(clinic_url)
        host = parsed.netloc.replace(".", "-").strip("-")
        slug = parsed.path.rstrip("/").split("/")[-1]
        if host:
            return f"103-clinic-{host}"
        if slug:
            return f"103-clinic-{slug}"
        return f"103-clinic-{re.sub(r'[^a-z0-9]+', '-', clinic_name.lower())}-{abs(hash(address))}"

    def _doctor_external_id(self, url: str) -> str:
        return f"103-spec-{urlparse(url).path.rstrip('/').split('/')[-1]}"
