#!/usr/bin/env python3
"""Read-only, fail-closed summary of independently observed HILO route drift.

A green diagnostic workflow is NOT production release clearance. This script
does no network I/O and never treats an unavailable control as a global outage.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path


def classify(report: dict) -> dict:
    rows = report.get("route_baseline_checks") or []
    confirmed, divergent, unknown = [], [], []
    for row in rows:
        ident = row.get("id")
        if not isinstance(ident, str) or not ident:
            continue
        public, origin = row.get("public_status"), row.get("baseline_status")
        if type(public) is not int or type(origin) is not int:
            unknown.append(ident)
        elif public in (404, 410) and origin == 200:
            confirmed.append(ident)
        elif public != origin or row.get("body_mismatch") is True:
            divergent.append(ident)
    control_ok = report.get("network_control_status") == 200
    if not control_ok or not rows or len(unknown) == len(rows):
        status = "measurement_unconfirmed"
    elif confirmed:
        status = "public_route_degraded"
    elif divergent:
        status = "origin_divergence"
    elif unknown:
        status = "partially_measured"
    else:
        status = "measured_routes_match"
    # Even a clean snapshot cannot prove the deployed immutable commit.
    return {
        "classification": status,
        "network_control_http_200": control_ok,
        "observed_at_utc": report.get("finished_at"),
        "compared_route_count": len(rows),
        "confirmed_public_404_or_410_vs_origin_200": sorted(set(confirmed)) if control_ok else [],
        "other_origin_divergence_ids": sorted(set(divergent)) if control_ok else [],
        "unmeasured_comparison_ids": sorted(set(unknown)),
        "release_clearance": False,
        "deployed_commit_verified": False,
        "not_global_outage_evidence": True,
        "requires_human_release_review": True,
        "source": "retained GitHub-hosted GrowthOps HTTP comparison, not a deployment control plane",
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--report", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    result = classify(json.loads(args.report.read_text(encoding="utf-8")))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
