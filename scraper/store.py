"""Supabase REST upserts (service-role key) for job_listings + pipeline_runs."""

import os
from typing import Any
import requests


def _sb_headers() -> dict[str, str]:
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    return {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }


def _sb_url(path: str) -> str:
    base = os.environ.get("SUPABASE_URL", "")
    return f"{base}/rest/v1/{path.lstrip('/')}"


def upsert_jobs(jobs: list[dict[str, Any]], user_id: str, track: str = "PM"):
    """Upsert job_listings rows in chunks of 50."""
    if not jobs:
        return
    url = _sb_url("/job_listings")
    headers = _sb_headers()
    headers["Prefer"] = "resolution=merge-duplicates"

    rows = []
    for j in jobs:
        rows.append({
            "job_id": j.get("id", ""),
            "user_id": user_id,
            "track": track,
            "portal": j.get("portal", ""),
            "title": j.get("title", ""),
            "company": j.get("company", ""),
            "location": j.get("location", ""),
            "salary": _fmt_salary(j.get("salary_min", 0), j.get("salary_max", 0)),
            "posted": j.get("posted", ""),
            "url": j.get("url", ""),
            "canon_url": j.get("canon_url", ""),
            "fit": j.get("fit", 0),
            "freshness": j.get("freshness_tag", "UNKNOWN"),
            "scores_json": j.get("scores_json"),
            "description": (j.get("description", "") or "")[:5000],
            "last_seen_date": __import__("datetime").date.today().isoformat(),
        })

    for i in range(0, len(rows), 50):
        chunk = rows[i : i + 50]
        try:
            requests.post(url, headers=headers, json=chunk, timeout=15)
        except requests.RequestException:
            pass  # Partial success is OK


def update_run(run_id: str, status: str, jobs_found: int = 0, error: str = ""):
    """Update pipeline_runs row."""
    url = _sb_url(f"/pipeline_runs?id=eq.{run_id}")
    headers = _sb_headers()
    payload: dict[str, Any] = {
        "status": status,
        "jobs_found": jobs_found,
        "finished_at": __import__("datetime").datetime.utcnow().isoformat(),
    }
    if error:
        payload["error"] = error
    try:
        requests.patch(url, headers=headers, json=payload, timeout=10)
    except requests.RequestException:
        pass


def _fmt_salary(sal_min: int, sal_max: int) -> str:
    if sal_min <= 0 and sal_max <= 0:
        return ""
    parts = []
    if sal_min > 0:
        parts.append(f"₹{_short_number(sal_min)}")
    if sal_max > sal_min:
        parts.append(f"₹{_short_number(sal_max)}")
    return " - ".join(parts)


def _short_number(val: int) -> str:
    if val >= 100_000:
        lakh = val / 100_000
        return f"{lakh:.0f}L" if lakh == int(lakh) else f"{lakh:.1f}L"
    return f"{val:,}"
