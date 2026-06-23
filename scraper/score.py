"""Scoring rubric — mirrors src/lib/jobScore.ts exactly.

Score parity requirement: any job scored by both Python and TS must get
the same result.
"""

import re
from . import config


def has_kw(text: str, kw: str) -> bool:
    """Word-boundary case-insensitive match."""
    return bool(re.search(rf"\b{re.escape(kw)}\b", text, re.IGNORECASE))


def count_kw(text: str, kws: list[str]) -> int:
    return sum(1 for kw in kws if has_kw(text, kw))


def company_tier(company: str) -> int:
    c = company.lower()
    for tier_list, score in [
        (config.TIER1_BFSI, 10),
        (config.GCC_FINTECH, 8),
        (config.IT_SERVICES, 6),
    ]:
        if any(t in c for t in tier_list):
            return score
    return 5


def location_score(loc: str) -> int:
    l = loc.lower()
    for words, score in [
        (config.FOREIGN_LOCS, 1),
        (config.GOOD_LOCS_PRIMARY, 10),
        (["remote"], 8),
        (["hybrid"], 7),
        (config.RELOCATABLE_METROS, 6),
    ]:
        if any(x in l for x in words):
            return score
    return 3


def comp_score(salary_min: int) -> tuple[int, str | None]:
    if salary_min >= config.COMP_FLOOR:
        bonus = (3 * (salary_min - config.COMP_FLOOR)) // config.COMP_FLOOR
        return min(18, 15 + bonus), None
    if salary_min > 0:
        return max(3, (15 * salary_min) // config.COMP_FLOOR), "below_floor"
    return 8, "comp_unknown"


def freshness(posted: str | None) -> tuple[str, int, int | None]:
    """Returns (tag, penalty, age_days)."""
    if not posted:
        return "UNKNOWN", -10, None

    s = posted.strip()
    age: int | None = None

    # ISO-8601
    try:
        from datetime import datetime, timezone
        d = datetime.fromisoformat(s.replace("Z", "+00:00"))
        age = max(0, int((datetime.now(timezone.utc) - d).days))
    except (ValueError, TypeError):
        pass

    # Plain YYYY-MM-DD
    if age is None and re.match(r"^\d{4}-\d{2}-\d{2}", s):
        try:
            from datetime import datetime
            d = datetime.strptime(s[:10], "%Y-%m-%d")
            age = max(0, (datetime.now() - d).days)
        except (ValueError, TypeError):
            pass

    # Relative text
    if age is None:
        lower = s.lower()
        if re.search(r"just|today|now|few hours?", lower):
            age = 0
        elif "yesterday" in lower:
            age = 1
        elif "week" in lower:
            m = re.search(r"\d+", s)
            age = int(m.group()) * 7 if m else None
        elif "month" in lower:
            m = re.search(r"\d+", s)
            age = int(m.group()) * 30 if m else 99
        elif "day" in lower:
            m = re.search(r"\d+", s)
            age = int(m.group()) if m else None

    if age is None:
        return "UNKNOWN", -10, None
    if age < 0:
        age = 0
    if age <= config.FRESH_MAX:
        return "FRESH", 0, age
    if age <= config.AGING_MAX:
        return "AGING", -10, age
    return "STALE", -100, age


def score_job(
    title: str,
    company: str,
    description: str,
    salary_min: int = 0,
    location: str = "",
    track: str = "PM",
) -> dict:
    """Main scorer. Returns dict with 'total', 'breakdown', 'flags'."""
    title_l = title.lower()
    company_l = company.lower()
    desc_l = (description or "").lower()
    text = f"{title_l} {desc_l}"
    text_co = f"{text} {company_l}"
    flags: list[str] = []
    breakdown: dict[str, int] = {}

    if len(desc_l.strip()) < 40:
        flags.append("no_description")

    if track == "PM":
        if any(has_kw(title_l, kw) for kw in config.SENIOR_PM_KW):
            breakdown["role_match"] = 23
        elif has_kw(title_l, "program manager"):
            breakdown["role_match"] = 18
        elif has_kw(title_l, "project manager"):
            breakdown["role_match"] = 15
        else:
            breakdown["role_match"] = 10
        breakdown["governance"] = min(20, count_kw(text, config.GOVERNANCE_KW) * 5)
        breakdown["domain_fit"] = min(15, count_kw(text_co, config.BFSI_KEYWORDS) * 5)
    else:
        # SM or DIR — simplified stub; PM track is v1
        breakdown["role_match"] = 10
        breakdown["governance"] = 0
        breakdown["domain_fit"] = 0

    cs, cflag = comp_score(salary_min)
    breakdown["comp"] = cs
    if cflag:
        flags.append(cflag)
    breakdown["location"] = location_score(location)
    breakdown["org_quality"] = company_tier(company_l)

    neg = count_kw(text, config.NEGATIVE_KW)
    if neg:
        breakdown["seniority_penalty"] = -10 * neg
        flags.append("junior_signal")

    raw_total = sum(breakdown.values())
    return {"total": raw_total, "breakdown": breakdown, "flags": flags}
