"""Pipeline entry point.

Usage:
    python -m scraper.run --user-id <uuid> --run-id <uuid> --track PM

Reads search_config for the user, scrapes all enabled portals, scores,
deduplicates, upserts into job_listings, and updates pipeline_runs.
"""

import argparse
import os
import sys
from typing import Any

import requests

from . import score as sc
from .portals import fetch_adzuna, fetch_linkedin
from .store import upsert_jobs, update_run


def get_config(user_id: str) -> dict[str, Any] | None:
    """Fetch the user's search_config from Supabase."""
    supabase_url = os.environ.get("SUPABASE_URL", "")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not supabase_url or not key:
        print("ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.")
        return None

    url = f"{supabase_url}/rest/v1/search_config?user_id=eq.{user_id}&select=*"
    headers = {"Authorization": f"Bearer {key}"}
    try:
        resp = requests.get(url, headers=headers, timeout=10)
        resp.raise_for_status()
        rows = resp.json()
        if not rows:
            print(f"No search_config for user {user_id}")
            return None
        return rows[0]
    except requests.RequestException as e:
        print(f"Failed to fetch config: {e}")
        return None


def main():
    parser = argparse.ArgumentParser(description="MazaCV job scrape pipeline")
    parser.add_argument("--user-id", required=True, help="Supabase user UUID")
    parser.add_argument("--run-id", required=True, help="pipeline_runs UUID")
    parser.add_argument("--track", default="PM", help="Scoring track (PM/SM/DIR)")
    parser.add_argument("--portals", nargs="*", default=["Adzuna", "LinkedIn"],
                        help="Portals to scrape")
    args = parser.parse_args()

    config = get_config(args.user_id)
    if not config:
        update_run(args.run_id, "error", error="No search_config found")
        sys.exit(1)

    job_titles = (config.get("job_titles") or "").strip()
    keywords = (config.get("keywords") or "").strip()
    location = (config.get("locations") or "").strip()
    salary_min_lpa = config.get("salary_min_lpa") or 0
    salary_min = salary_min_lpa * 100_000 if salary_min_lpa > 0 else 0

    # Build query
    terms = []
    if job_titles:
        parts = [t.strip() for t in job_titles.replace(",", " OR ").split(" OR ")]
        terms.extend(f'"{p}"' if " " in p else p for p in parts if p)
    if keywords:
        kw_parts = [k.strip() for k in keywords.replace(",", " OR ").split(" OR ")]
        terms.extend(f'"{k}"' if " " in k else k for k in kw_parts if k)
    query = " OR ".join(terms[:6])  # Cap at 6 terms

    if not query:
        update_run(args.run_id, "error", error="Empty query from config")
        sys.exit(1)

    print(f"Query: {query}")
    print(f"Location: {location or 'India'}")
    print(f"Portals: {args.portals}")

    all_jobs: list[dict[str, Any]] = []
    portal_errors: list[str] = []

    for portal in args.portals:
        try:
            if portal == "Adzuna":
                jobs = fetch_adzuna(query, location, salary_min)
            elif portal == "LinkedIn":
                jobs = fetch_linkedin(query, location)
            else:
                print(f"Skipping unsupported portal: {portal}")
                continue
            print(f"{portal}: {len(jobs)} results")
            all_jobs.extend(jobs)
        except Exception as e:
            portal_errors.append(f"{portal}: {e}")
            print(f"{portal} error: {e}")

    # Score + deduplicate
    scored: list[dict[str, Any]] = []
    seen_canon: set[str] = set()
    for j in all_jobs:
        result = sc.score_job(
            title=j.get("title", ""),
            company=j.get("company", ""),
            description=j.get("description", ""),
            salary_min=j.get("salary_min", 0),
            location=j.get("location", ""),
            track=args.track,
        )
        tag, penalty, _ = sc.freshness(j.get("posted", ""))
        fit = max(0, result["total"] + penalty)
        j["fit"] = fit
        j["freshness_tag"] = tag
        j["scores_json"] = result["breakdown"]

        canon = j.get("canon_url", "")
        if canon and canon in seen_canon:
            continue
        if canon:
            seen_canon.add(canon)
        scored.append(j)

    # Drop STALE / zero-score
    scored = [j for j in scored if j["fit"] > 0]

    print(f"After score+dedup: {len(scored)} jobs")

    # Upsert to Supabase
    upsert_jobs(scored, args.user_id, args.track)

    # Update run status
    error_msg = "; ".join(portal_errors) if portal_errors else ""
    update_run(args.run_id, "done", jobs_found=len(scored), error=error_msg)

    print(f"Done. {len(scored)} jobs stored.")


if __name__ == "__main__":
    main()
