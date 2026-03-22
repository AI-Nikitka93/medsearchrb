from __future__ import annotations

import html
import json
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


class TwoDocScraper(BaseScraper):
    source_name = "2doc.by"
    base_url = "https://2doc.by"
    allowed_seed_urls = (
        "https://2doc.by/sitemap-doctor.xml",
        "https://2doc.by/doctor/Lysenok-alexandr-yurievich",
    )

    def collect(self):
        batch = self.empty_batch()
        clinic_map: dict[str, ClinicRecord] = {}

        doctor_urls = self._collect_doctor_urls()
        for doctor_url in self.trim_doctor_urls(doctor_urls):
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
        response = self.client.get_text(self.absolute_url("/sitemap-doctor.xml"), referer=self.base_url)
        root = ET.fromstring(response.text)
        urls: list[str] = []
        for loc in root.findall("s:url/s:loc", SITEMAP_NS):
            if not loc.text:
                continue
            urls.append(html.unescape(loc.text.strip()))
        unique_urls = self.unique_urls(urls)
        return self.slice_urls_with_env(
            unique_urls,
            offset_env="TWODOC_URL_OFFSET",
            limit_env="TWODOC_URL_LIMIT",
        )

    def _extract_doctor(
        self,
        doctor_url: str,
    ) -> tuple[DoctorRecord | None, ReviewSummaryRecord | None, list[ClinicRecord]]:
        response = self.client.get_text(doctor_url, referer=self.absolute_url("/doctors"))
        soup = self.soup(response.text)

        title = soup.title.get_text(" ", strip=True) if soup.title else ""
        if "врач" not in title.lower():
            return None, None, []

        heading = self.normalize_space(soup.find("h1").get_text(" ", strip=True) if soup.find("h1") else "")
        full_name = re.sub(r"\s*-\s*врач.*$", "", heading, flags=re.IGNORECASE).strip()
        if not full_name:
            return None, None, []

        doctor_block = self._extract_doctor_block(response.text)
        if not doctor_block:
            return None, None, []

        doctor_numeric_id = self._extract_int(doctor_block, r'\\"id\\":(\d+)')
        if doctor_numeric_id is None:
            return None, None, []

        review_count = self._extract_int(doctor_block, r'\\"comment_count\\":(\d+)') or 0
        rating_value = self._extract_float(doctor_block, r'\\"rating\\":(\d+(?:\.\d+)?)')
        if review_count <= 0 or (rating_value is not None and rating_value <= 0):
            rating_value = None

        specialty_names = self._extract_specialties(doctor_block)
        clinics = self._extract_clinics(doctor_block)

        external_id = f"2doc-doctor-{doctor_numeric_id}"
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
                confidence_score=0.45,
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
            confidence_score=0.45,
            specialty_names=specialty_names or ["Не указано"],
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

    def _extract_doctor_block(self, html_text: str) -> str | None:
        match = re.search(r'\\"doctor\\":\{(?P<block>.*?)\},\\"page_title\\"', html_text, re.DOTALL)
        if not match:
            return None
        return match.group("block")

    def _extract_specialties(self, doctor_block: str) -> list[str]:
        match = re.search(r'\\"specialization\\":\[(?P<block>.*?)\],\\"clinic\\"', doctor_block, re.DOTALL)
        if not match:
            return []

        specialties: list[str] = []
        for raw_name in re.findall(r'\\"name\\":\\"(.*?)\\"', match.group("block")):
            name = self._decode_escaped(raw_name)
            if name and name not in specialties:
                specialties.append(name)
        return specialties

    def _extract_clinics(self, doctor_block: str) -> list[ClinicRecord]:
        match = re.search(r'\\"clinic\\":\[(?P<block>.*?)\],\\"service\\"', doctor_block, re.DOTALL)
        if not match:
            return []

        clinics: list[ClinicRecord] = []
        for clinic_match in re.finditer(
            r'\{\\"id\\":(?P<id>\d+),\\"name\\":\\"(?P<name>.*?)\\",\\"slug\\":\\"(?P<slug>.*?)\\".*?\\"address\\":\\"(?P<address>.*?)\\"',
            match.group("block"),
            re.DOTALL,
        ):
            clinic_id = clinic_match.group("id")
            clinic_name = self._decode_escaped(clinic_match.group("name"))
            clinic_slug = self._decode_escaped(clinic_match.group("slug"))
            clinic_address = self._decode_escaped(clinic_match.group("address"))

            if not clinic_name or not clinic_slug:
                continue

            clinics.append(
                ClinicRecord(
                    source=self.source_name,
                    external_id=f"2doc-clinic-{clinic_id}",
                    name=clinic_name,
                    url=self.absolute_url(f"/clinic/{clinic_slug}"),
                    address=clinic_address or None,
                    source_type="aggregator",
                    is_official=False,
                    source_priority=100,
                    verification_status="aggregator_only",
                    source_url=self.absolute_url(f"/clinic/{clinic_slug}"),
                )
            )

        return clinics

    def _extract_int(self, text: str, pattern: str) -> int | None:
        match = re.search(pattern, text)
        return int(match.group(1)) if match else None

    def _extract_float(self, text: str, pattern: str) -> float | None:
        match = re.search(pattern, text)
        return float(match.group(1)) if match else None

    def _decode_escaped(self, value: str) -> str:
        try:
            return self.normalize_space(json.loads(f'"{value}"'))
        except Exception:
            return self.normalize_space(value.replace("\\/", "/"))
