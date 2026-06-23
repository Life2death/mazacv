"""Canonical URL normalization — mirrors src/lib/jobScore.ts."""

from urllib.parse import urlparse


def canonical_url(url: str) -> str:
    """Normalize a URL for dedup (strip www, trailing slash, keep proto+host+path)."""
    if not url:
        return ""
    try:
        parsed = urlparse(url)
        host = parsed.hostname.lower() if parsed.hostname else ""
        if host.startswith("www."):
            host = host[4:]
        path = parsed.path.rstrip("/")
        return f"{parsed.scheme}://{host}{path}"
    except Exception:
        return ""
