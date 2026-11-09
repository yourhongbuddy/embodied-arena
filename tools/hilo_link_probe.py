#!/usr/bin/env python3
"""Bounded, read-only WANTED documentation-link checks from public browser inventory.

Only a single-segment, visible WANTED reference is eligible. No query strings,
private endpoints, redirects, credentials, response bodies, or writes.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
import re
import urllib.error
import urllib.request

HOST = "https://getrobotrouter.com"
MAX_LINKS = 16
# Only documentation-like one-segment WANTED paths; reject generic site/app/API links.
DOC_PATH = re.compile(r"^/wanted-10k/[a-z0-9][a-z0-9-]*(?:\.(?:html|json|py))?$")


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def allowed_path(path: object) -> bool:
    return isinstance(path, str) and len(path) <= 128 and bool(DOC_PATH.fullmatch(path))


def fetch_status(path: str) -> int | None:
    """One bounded GET; do not follow redirects or keep page content."""
    opener = urllib.request.build_opener(NoRedirect())
    request = urllib.request.Request(
        HOST + path, method="GET",
        headers={"User-Agent": "HILO-ReadOnly-DocLinkAudit/0.1",
                 "Accept-Encoding": "identity", "Range": "bytes=0-0"})
    try:
        try:
            response = opener.open(request, timeout=4)
        except urllib.error.HTTPError as error:
            response = error
        with response:
            response.read(1)
            return response.code
    except (OSError, urllib.error.URLError):
        return None


def probe_inventory(inventory: dict, fetch=fetch_status, limit: int = MAX_LINKS) -> dict:
    if not 0 <= limit <= MAX_LINKS:
        raise ValueError("Link probe limit must be between 0 and 16")
    raw = inventory.get("same_origin_links")
    if not isinstance(raw, list):
        raise ValueError("Browser link inventory must be a list")
    # Existing measured routes are not re-requested. Never trust arbitrary paths.
    paths = sorted({row["path"] for row in raw if isinstance(row, dict)
                    and allowed_path(row.get("path"))
                    and row.get("checked") is False
                    and row.get("http_status_from_existing_probe") is None
                    # The DOM inventory removes URL queries for privacy. A
                    # queryless GET cannot validate a query-bearing variant.
                    and row.get("query_variant_unverified") is not True})
    rows = []
    for path in paths[:limit]:
        try:
            status = fetch(path)
        except (OSError, urllib.error.URLError):
            status = None
        result = ("http_success" if status in (200, 206)
                  else "http_missing" if status in (404, 410)
                  else "measurement_failed" if status is None
                  else "http_other")
        rows.append({"path": path, "status": status, "result": result})
    kinds = ("http_success", "http_missing", "http_other", "measurement_failed")
    return {"vantage": "bounded_public_WANTED_doc_GET",
            "fixed_origin": HOST, "limit": limit, "probed": len(rows),
            "eligible_unverified": len(paths),
            "unprobed_eligible": len(paths)-len(rows),
            "not_a_full_crawl": True, "redirects_followed": False,
            "result_counts": {kind: sum(row["result"] == kind for row in rows)
                              for kind in kinds},
            "confirmed_missing": [r["path"] for r in rows if r["result"] == "http_missing"],
            "results": rows}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--inventory", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--limit", type=int, default=MAX_LINKS)
    args = parser.parse_args()
    summary = probe_inventory(json.loads(args.inventory.read_text(encoding="utf-8")),
                              limit=args.limit)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
    print("doc_links_probed={} {}".format(summary["probed"],
          " ".join(f"{key}={value}" for key, value in summary["result_counts"].items())))


if __name__ == "__main__":
    main()
