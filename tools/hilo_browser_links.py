#!/usr/bin/env python3
"""Read-only inventory of links in an independently rendered public HILO page.

No requests are performed here. Only an already retained GrowthOps probe can
establish a linked route's HTTP status; all other links/assets stay unverified.
"""
from __future__ import annotations

import argparse
from html.parser import HTMLParser
import json
from pathlib import Path
from urllib.parse import urljoin, urlsplit

BASE = "https://getrobotrouter.com/wanted-10k"
PUBLIC_HOST = "getrobotrouter.com"


class References(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = set()
        self.assets = set()

    def handle_starttag(self, tag, attrs):
        data = dict(attrs)
        if tag == "a" and data.get("href"):
            self.links.add(data["href"])
        if tag in ("script", "img", "source") and data.get("src"):
            self.assets.add(data["src"])
        if tag == "link" and data.get("href"):
            rel = (data.get("rel") or "").lower().split()
            if any(token in rel for token in ("stylesheet", "icon", "preload", "modulepreload")):
                self.assets.add(data["href"])


def public_path(raw: str, base: str) -> str | None:
    u = urlsplit(urljoin(base, raw))
    if u.scheme != "https" or u.hostname != PUBLIC_HOST or u.port not in (None, 443):
        return None
    if u.username or u.password:
        return None
    # Deliberately omit query strings and fragments from evidence artifacts.
    return u.path or "/"


def summarize(html: str, report: dict, base: str = BASE) -> dict:
    parsed = References()
    parsed.feed(html)
    statuses = {}
    for entry in report.get("records", []):
        result = entry.get("result") or {}
        observed = result.get("measurement") or {}
        url = observed.get("url")
        if url:
            path = public_path(url, base)
            if path and observed.get("status_code") is not None:
                statuses[path.rstrip("/") or "/"] = observed["status_code"]

    def classify(refs):
        paths = sorted({path for raw in refs if (path := public_path(raw, base))})
        rows = []
        for path in paths:
            status = statuses.get(path.rstrip("/") or "/")
            rows.append({"path": path, "http_status_from_existing_probe": status,
                         "checked": status is not None})
        return rows

    links, assets = classify(parsed.links), classify(parsed.assets)
    return {
        "vantage": "public_browser_DOM_plus_existing_GrowthOps_HTTP_probes",
        "not_a_full_crawl": True, "no_new_HTTP_requests_by_inventory": True,
        "page": base,
        "same_origin_links": links,
        "same_origin_assets": assets,
        "broken_link_paths_confirmed_by_existing_probes": sorted(
            {row["path"] for row in links if row["http_status_from_existing_probe"] == 404}),
        "unverified_link_count": sum(not x["checked"] for x in links),
        "unverified_asset_count": sum(not x["checked"] for x in assets),
    }


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--html", type=Path, required=True)
    p.add_argument("--report", type=Path, required=True)
    p.add_argument("--output", type=Path, required=True)
    args = p.parse_args()
    result = summarize(args.html.read_text(encoding="utf-8"),
                       json.loads(args.report.read_text(encoding="utf-8")))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
