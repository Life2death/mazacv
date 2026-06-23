"""Portal fetchers — Adzuna, LinkedIn (guest scrape), and cookie portal stubs."""

import os
import time
from typing import Any
import requests


def fetch_adzuna(query: str, location: str, salary_min: int = 0) -> list[dict[str, Any]]:
    """Search Adzuna India job listings."""
    app_id = os.environ.get("ADZUNA_APP_ID", "")
    api_key = os.environ.get("ADZUNA_API_KEY", "")
    if not app_id or not api_key:
        return []

    params: dict[str, Any] = {
        "app_id": app_id,
        "app_key": api_key,
        "what": query,
        "where": location or "India",
        "results_per_page": 10,
        "sort_by": "date",
        "max_days_old": 30,
    }
    if salary_min > 0:
        params["salary_min"] = salary_min

    try:
        resp = requests.get(
            "https://api.adzuna.com/v1/api/jobs/in/search/1",
            params=params,
            timeout=15,
            headers={"User-Agent": "MazaCV-Pipeline/1.0"},
        )
        resp.raise_for_status()
        data = resp.json()
        items = data.get("results", [])
        results = []
        for item in items:
            company = (item.get("company") or {}).get("display_name", "")
            loc_data = item.get("location", {})
            loc = loc_data.get("display_name", location) if isinstance(loc_data, dict) else location
            sal_min = item.get("salary_min") or 0
            sal_max = item.get("salary_max") or 0
            url = item.get("redirect_url", "")
            from .dedup import canonical_url
            curie = f"adz_{item.get('id', '')}"
            results.append({
                "id": curie,
                "canon_url": canonical_url(url) or curie,
                "title": item.get("title", ""),
                "company": company,
                "location": loc,
                "salary_min": sal_min or 0,
                "salary_max": sal_max or 0,
                "posted": item.get("created", ""),
                "url": url,
                "portal": "Adzuna",
                "description": (item.get("description", "") or "")[:2000],
            })
        return results
    except requests.RequestException:
        return []


def fetch_linkedin(query: str, location: str) -> list[dict[str, Any]]:
    """Scrape LinkedIn guest search results."""
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

    import re
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
                from .dedup import canonical_url
                li_id = f"li_{jid}"
                jobs.append({
                    "id": li_id,
                    "canon_url": canonical_url(li_url) or li_id,
                    "title": title,
                    "company": company,
                    "location": loc,
                    "salary_min": 0,
                    "salary_max": 0,
                    "posted": posted,
                    "url": li_url,
                    "portal": "LinkedIn",
                    "description": "",
                })
            return jobs
        except requests.RequestException:
            continue
    return []


def _strip_html(html: str) -> str:
    import re
    text = re.sub(r"<[^>]*>", "", html)
    for ent, ch in [("&amp;", "&"), ("&lt;", "<"), ("&gt;", ">"), ("&quot;", '"'), ("&#39;", "'")]:
        text = text.replace(ent, ch)
    return text.strip()
