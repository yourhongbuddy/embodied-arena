#!/usr/bin/env python3
"""Bounded read-only checks of static assets seen in a public browser DOM.

Do not follow links, run scripts, retain URL query parameters or label an
unmeasured asset as healthy. This checks HTTP responses, not browser execution.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
import re
import urllib.error
import urllib.request

HOST = "https://getrobotrouter.com"
MAX_ASSETS = 20
# Exclude dynamic image optimizers, query-dependent and arbitrary app routes.
STATIC = re.compile(r"^/(?:_next/static/|static/|assets/|images/|favicon(?:\.[a-z0-9]+)?$)")
SAFE_PATH = re.compile(r"^/[A-Za-z0-9_./-]+$")


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def allowed_asset_path(path: object) -> bool:
    return (isinstance(path, str) and bool(SAFE_PATH.fullmatch(path))
            and bool(STATIC.match(path))
            and all(part not in (".", "..", "") for part in path[1:].split("/"))
            and len(path) <= 512)


def fetch_status(path: str) -> int | None:
    """One GET with a one-byte range; never follow redirects or record bodies."""
    opener = urllib.request.build_opener(NoRedirect())
    req = urllib.request.Request(
        HOST + path,
        headers={"User-Agent": "HILO-ReadOnly-StaticAudit/0.1",
                 "Accept-Encoding": "identity", "Range": "bytes=0-0"},
        method="GET")
    try:
        try:
            response = opener.open(req, timeout=8)
        except urllib.error.HTTPError as error:
            response = error
        with response:
            response.read(1)
            return response.code
    except (OSError, urllib.error.URLError):
        return None


def probe_inventory(inventory: dict, fetch=fetch_status, limit: int = MAX_ASSETS) -> dict:
    if not 0 <= limit <= MAX_ASSETS:
        raise ValueError("Probe limit must be between 0 and 20")
    raw = inventory.get("same_origin_assets", [])
    if not isinstance(raw, list):
        raise ValueError("Asset inventory must be a list")
    paths = sorted({row.get("path") for row in raw if isinstance(row, dict)
                    and allowed_asset_path(row.get("path"))})
    selected = paths[:limit]
    rows = []
    for path in selected:
        try:
            status = fetch(path)
        except (OSError, urllib.error.URLError):
            status = None
        # Never classify blocked/redirecting/unmeasured responses as missing.
        state = ("http_success" if status in (200, 206)
                 else "http_missing" if status in (404, 410)
                 else "measurement_failed" if status is None
                 else "http_other")
        rows.append({"path": path, "status": status, "result": state})
    counts = {kind: sum(row["result"] == kind for row in rows)
              for kind in ("http_success", "http_missing", "http_other", "measurement_failed")}
    return {"vantage": "bounded_public_static_asset_GET",
            "result_counts": counts,
            "not_a_full_crawl": True, "no_scripts_executed": True,
            "fixed_origin": HOST, "limit": limit,
            "eligible_static_assets": len(paths),
            "probed": len(rows), "unprobed_eligible": len(paths)-len(rows),
            "confirmed_missing": [x["path"] for x in rows if x["result"] == "http_missing"],
            "results": rows}


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--inventory", type=Path, required=True)
    p.add_argument("--output", type=Path, required=True)
    p.add_argument("--limit", type=int, default=MAX_ASSETS)
    args = p.parse_args()
    summary = probe_inventory(json.loads(args.inventory.read_text(encoding="utf-8")),
                              limit=args.limit)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
    print("static_assets_probed={} {}".format(summary["probed"],
          " ".join(f"{kind}={count}" for kind, count in summary["result_counts"].items())))


if __name__ == "__main__":
    main()
