"""Portal fetchers — Adzuna, LinkedIn, Naukri, Foundit, IIMJobs."""

import base64
import os
import re
import socket
import time
from typing import Any

import requests
from curl_cffi import requests as curl_requests
from Crypto.PublicKey import RSA
from Crypto.Cipher import PKCS1_v1_5

from .dedup import canonical_url


socket.setdefaulttimeout(20)
_orig_getaddrinfo = socket.getaddrinfo
def _ipv4(host, port, family=0, type=0, proto=0, flags=0):
    return _orig_getaddrinfo(host, port, socket.AF_INET, type, proto, flags)
socket.getaddrinfo = _ipv4


NAUKRI_LOC_MAP = {
    "Mumbai": "103", "Pune": "67", "Bangalore": "4", "Delhi": "96",
    "Hyderabad": "17", "Chennai": "9", "Kolkata": "21", "Ahmedabad": "1",
    "Noida": "114", "Gurgaon": "118",
}

IIMJOBS_LOC_MAP = {
    "Mumbai": "Mumbai", "Pune": "Pune", "Bangalore": "Bangalore",
    "Delhi": "Delhi", "Hyderabad": "Hyderabad", "Chennai": "Chennai",
    "Kolkata": "Kolkata", "Ahmedabad": "Ahmedabad", "Noida": "Noida", "Gurgaon": "Gurgaon",
}


def fetch_adzuna(query: str, location: str, salary_min: int = 0) -> list[dict[str, Any]]:
    app_id = os.environ.get("ADZUNA_APP_ID", "")
    api_key = os.environ.get("ADZUNA_API_KEY", "")
    if not app_id or not api_key:
        return []

    params: dict[str, Any] = {
        "app_id": app_id, "app_key": api_key, "what": query,
        "where": location or "India", "results_per_page": 10,
        "sort_by": "date", "max_days_old": 30,
    }
    if salary_min > 0:
        params["salary_min"] = salary_min

    try:
        resp = requests.get(
            "https://api.adzuna.com/v1/api/jobs/in/search/1",
            params=params, timeout=15,
            headers={"User-Agent": "MazaCV-Pipeline/1.0"},
        )
        resp.raise_for_status()
        data = resp.json()
        results = []
        for item in data.get("results", []):
            company = (item.get("company") or {}).get("display_name", "")
            loc_data = item.get("location", {})
            loc = loc_data.get("display_name", location) if isinstance(loc_data, dict) else location
            sal_min = item.get("salary_min") or 0
            url = item.get("redirect_url", "")
            curie = f"adz_{item.get('id', '')}"
            results.append({
                "id": curie, "canon_url": canonical_url(url) or curie,
                "title": item.get("title", ""), "company": company,
                "location": loc, "salary_min": sal_min or 0,
                "salary_max": item.get("salary_max") or 0,
                "posted": item.get("created", ""), "url": url,
                "portal": "Adzuna",
                "description": (item.get("description", "") or "")[:2000],
            })
        return results
    except requests.RequestException:
        return []


def fetch_linkedin(query: str, location: str) -> list[dict[str, Any]]:
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/124.0.0.0 Safari/537.36"
        ),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    }
    params = {"keywords": query, "location": location or "India", "start": "0", "f_TPR": "r604800"}
    urls = [
        "https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search",
        "https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search",
    ]

    for url in urls:
        try:
            resp = requests.get(url, params=params, headers=headers, timeout=20)
            if resp.status_code >= 400:
                continue
            html = resp.text
            jobs = []
            pattern = re.compile(r'<li[^>]*data-entity-urn="[^"]*:(\d+)"[^>]*>([\s\S]*?)</li>', re.IGNORECASE)
            for match in pattern.finditer(html):
                jid = match.group(1)
                block = match.group(2)
                title_m = re.search(
                    r'<h3[^>]*class="[^"]*base-search-card__title[^"]*"[^>]*>([\s\S]*?)</h3>', block, re.IGNORECASE
                ) or re.search(r'<h3[^>]*class="[^"]*title[^"]*"[^>]*>([\s\S]*?)</h3>', block, re.IGNORECASE)
                comp_m = re.search(
                    r'<h4[^>]*class="[^"]*base-search-card__subtitle[^"]*"[^>]*>([\s\S]*?)</h4>', block, re.IGNORECASE
                ) or re.search(r'<h4[^>]*class="[^"]*subtitle[^"]*"[^>]*>([\s\S]*?)</h4>', block, re.IGNORECASE)
                loc_m = re.search(
                    r'<span[^>]*class="[^"]*job-search-card__location[^"]*"[^>]*>([\s\S]*?)</span>', block, re.IGNORECASE
                ) or re.search(r'<span[^>]*class="[^"]*location[^"]*"[^>]*>([\s\S]*?)</span>', block, re.IGNORECASE)
                time_m = re.search(r'<time[^>]*datetime="([^"]*)"[^>]*>', block, re.IGNORECASE)

                title = _strip_html(title_m.group(1)).strip() if title_m else ""
                company = _strip_html(comp_m.group(1)).strip() if comp_m else ""
                loc = _strip_html(loc_m.group(1)).strip() if loc_m else location
                posted = time_m.group(1) if time_m else ""

                if not title or not jid:
                    continue
                li_url = f"https://www.linkedin.com/jobs/view/{jid}"
                li_id = f"li_{jid}"
                jobs.append({
                    "id": li_id, "canon_url": canonical_url(li_url) or li_id,
                    "title": title, "company": company, "location": loc,
                    "salary_min": 0, "salary_max": 0, "posted": posted,
                    "url": li_url, "portal": "LinkedIn", "description": "",
                })
            return jobs
        except requests.RequestException:
            continue
    return []


# ─── Naukri ──────────────────────────────────────────────────────────────────────

NAUKRI_PUBLIC_KEY = """-----BEGIN PUBLIC KEY-----
MFwwDQYJKoZIhvcNAQEBBQADSwAwSAJBALrlQ+djR0RjJwBF1xuisHmdFv334MIm
K6LgzJhmLhN7B5yuEyaKoasgXQk3+OQglsOaBxEJ0j5PcTL3nbOvt80CAwEAAQ==
-----END PUBLIC KEY-----"""

_NAUKRI_CRYPTO = None

def _naukri_nkparam():
    global _NAUKRI_CRYPTO
    if _NAUKRI_CRYPTO is None:
        key = RSA.import_key(NAUKRI_PUBLIC_KEY)
        _NAUKRI_CRYPTO = PKCS1_v1_5.new(key)
    timestamp = int(time.time() * 1000)
    plaintext = f"v0|{timestamp}|121_srp"
    encrypted = _NAUKRI_CRYPTO.encrypt(plaintext.encode("utf-8"))
    return base64.b64encode(encrypted).decode("utf-8")


def fetch_naukri(query: str, location: str, salary_min: int = 0) -> list[dict[str, Any]]:
    cookie = os.environ.get("NAUKRI_COOKIE", "")
    if not cookie:
        return []

    loc_id = NAUKRI_LOC_MAP.get(location, location)
    headers = {
        "accept": "application/json", "appid": "109", "clientid": "d3skt0p",
        "content-type": "application/json", "systemid": "Naukri",
        "user-agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/124.0.0.0 Safari/537.36"
        ),
        "gid": "LOCATION,INDUSTRY,EDUCATION,FAREA_ROLE",
        "cookie": cookie,
    }

    jobs = []
    for page in range(3):
        try:
            headers["nkparam"] = _naukri_nkparam()
            resp = requests.get(
                "https://www.naukri.com/jobapi/v3/search",
                headers=headers,
                params={
                    "noOfResults": "20", "urlType": "search_by_keyword",
                    "searchType": "adv", "keyword": query,
                    "location": location, "pageNo": str(page + 1),
                    "sort": "r", "src": "jobsearchDesk", "latLong": "",
                },
                timeout=20,
            )
            if resp.status_code == 403:
                break
            if resp.status_code != 200:
                break
            items = resp.json().get("jobDetails", [])
            if not items:
                break

            for item in items:
                jid = item.get("jobId", "")
                if not jid:
                    continue
                placeholders = item.get("placeholders", [])
                loc_txt = ""
                for p in placeholders:
                    if p.get("type") == "location":
                        loc_txt = p.get("label", "")
                sal_range = item.get("salaryDetail", {}) or {}
                sal_min = sal_range.get("minimumSalary", 0) or 0
                posted_raw = item.get("modifiedOn", "") or item.get("createdOn", "") or ""
                nk_id = f"nk_{jid}"
                jd_url = item.get("jdURL") or item.get("jobUrl") or ""
                if not jd_url:
                    jd_url = f"https://www.naukri.com/job-listings-{jid}" if jid else ""
                jobs.append({
                    "id": nk_id, "canon_url": nk_id,
                    "title": item.get("title", ""),
                    "company": item.get("companyName", ""),
                    "location": loc_txt or location,
                    "salary_min": sal_min, "salary_max": 0,
                    "posted": posted_raw, "url": jd_url,
                    "portal": "Naukri",
                    "description": (item.get("jobDescription", "") or "")[:2000],
                })
            time.sleep(1)
        except Exception:
            break
    return jobs


# ─── Foundit ─────────────────────────────────────────────────────────────────────

def _foundit_location(locs: list) -> str:
    if not locs:
        return ""
    first = locs[0] if isinstance(locs[0], dict) else {}
    parts = []
    for key in ("city", "locality", "region", "state"):
        v = first.get(key)
        if isinstance(v, str) and v.strip():
            parts.append(v.strip())
            break
    country = first.get("country")
    if isinstance(country, str) and country.strip():
        parts.append(country.strip())
    if not parts:
        for key in ("label", "name", "displayName"):
            v = first.get(key)
            if isinstance(v, str) and v.strip():
                parts.append(v.strip())
                break
    return ", ".join(parts)


def fetch_foundit(query: str, location: str, salary_min: int = 0) -> list[dict[str, Any]]:
    cookie = os.environ.get("FOUNDIT_COOKIE", "")
    if not cookie:
        return []

    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/124.0.0.0 Safari/537.36"
        ),
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://www.foundit.in/",
        "Origin": "https://www.foundit.in",
        "Cookie": cookie,
    }

    jobs = []
    for page in range(3):
        try:
            resp = curl_requests.get(
                "https://apiv3.monsterindia.com/raven_ml/api/public/search/v3/jobs",
                headers=headers,
                params={"query": query, "location": location, "limit": 20, "start": page * 20},
                impersonate="chrome124",
                timeout=20,
            )
            if resp.status_code != 200:
                break
            items = resp.json().get("data", [])
            if not items:
                break

            for item in items:
                company_data = item.get("company") or {}
                comp = company_data.get("name", "") if isinstance(company_data, dict) else ""
                loc_txt = _foundit_location(item.get("locations") or [])
                posted = item.get("postedAt", 0)
                if posted:
                    try:
                        posted = __import__("datetime").datetime.fromtimestamp(posted / 1000).strftime("%Y-%m-%d")
                    except Exception:
                        posted = ""
                sal = item.get("minimumSalary") or {}
                salx = item.get("maximumSalary") or {}
                salmin = 0
                if isinstance(sal, dict) and sal.get("absoluteValue"):
                    salmin = sal["absoluteValue"]
                elif isinstance(salx, dict) and salx.get("absoluteValue"):
                    salmin = salx["absoluteValue"]
                desc = (item.get("description") or "").replace("<p>", " ").replace("</p>", " ")[:2000]
                jid = item.get("id") or item.get("jobId", "")
                url = item.get("jdUrl", "") or ""
                if url and not url.startswith("http"):
                    url = "https://www.foundit.in" + url
                if not url:
                    url = f"https://www.foundit.in/job/{jid}"
                fi_id = f"fi_{jid}"
                jobs.append({
                    "id": fi_id, "canon_url": fi_id,
                    "title": item.get("title", ""), "company": comp,
                    "location": loc_txt, "salary_min": salmin,
                    "salary_max": 0, "posted": posted, "url": url,
                    "portal": "Foundit",
                    "description": desc,
                })
            time.sleep(1)
        except Exception:
            break
    return jobs


# ─── IIMJobs ─────────────────────────────────────────────────────────────────────

def fetch_iimjobs(query: str, location: str, salary_min: int = 0) -> list[dict[str, Any]]:
    cookie = os.environ.get("IIMJOBS_COOKIE", "")
    if not cookie:
        return []

    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/124.0.0.0 Safari/537.36"
        ),
        "Accept": "application/json",
        "Referer": "https://www.iimjobs.com/",
        "Cookie": cookie,
    }

    loc = IIMJOBS_LOC_MAP.get(location, location)
    kw_parts = query.lower().split()

    jobs = []
    for page in range(1, 4):
        try:
            resp = curl_requests.get(
                "https://gladiator.iimjobs.com/job/alumni-jobs",
                params={"page": page, "size": 50},
                headers=headers, impersonate="chrome124", timeout=30,
            )
            if resp.status_code != 200:
                break
            items = resp.json().get("data", {}).get("jobs", [])
            if not items:
                break

            for item in items:
                title = (item.get("title") or "").strip()
                desc = (item.get("introText") or "")
                desig = (item.get("jobdesignation") or "")
                combined = (title + " " + desig + " " + desc).lower()

                if not any(w in combined for w in kw_parts):
                    continue

                raw_locs = [l.get("label", "") for l in (item.get("locations") or []) if l.get("label")]
                if raw_locs and loc != "India":
                    locs_lower = [x.lower() for x in raw_locs]
                    if loc not in locs_lower and not any(loc in x for x in locs_lower):
                        continue

                cd = item.get("companyData") or {}
                comp = cd.get("companyName") or cd.get("name") or item.get("createdByAlias") or ""
                job_url = item.get("jobDetailUrl") or ""
                if job_url and not job_url.startswith("http"):
                    job_url = "https://www.iimjobs.com" + job_url

                created_raw = item.get("createdTime") or item.get("createdTimeMs") or ""
                if isinstance(created_raw, (int, float)):
                    created = __import__("datetime").datetime.fromtimestamp(created_raw / 1000).strftime("%Y-%m-%d")
                else:
                    created = str(created_raw)

                iim_id = f"iim_{item.get('id', '')}_{page}"
                jobs.append({
                    "id": iim_id, "canon_url": iim_id,
                    "title": title, "company": comp,
                    "location": ", ".join(raw_locs) if raw_locs else location,
                    "salary_min": item.get("minSal") or 0,
                    "salary_max": item.get("maxSal") or 0,
                    "posted": created, "url": job_url,
                    "portal": "IIMJobs",
                    "description": desc[:2000],
                })

            if len(jobs) >= 100:
                break
            time.sleep(1)
        except Exception:
            break
    return jobs


def _strip_html(html: str) -> str:
    text = re.sub(r"<[^>]*>", "", html)
    for ent, ch in [("&amp;", "&"), ("&lt;", "<"), ("&gt;", ">"), ("&quot;", '"'), ("&#39;", "'")]:
        text = text.replace(ent, ch)
    return text.strip()
