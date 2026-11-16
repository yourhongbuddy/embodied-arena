"""Offline routing-evidence tests. No HTTP, deployment, or model calls."""
import unittest
from hilo_route_readiness import classify


def row(id, public, origin, *, body_mismatch=False):
    return {"id": id, "public_status": public, "baseline_status": origin,
            "body_mismatch": body_mismatch}


class RouteReadinessTests(unittest.TestCase):
    def report(self, rows, control=200):
        return {"network_control_status": control, "finished_at": "2026-11-11T17:00:00+00:00",
                "route_baseline_checks": rows}

    def test_four_public_404_origin_200_are_explicit_release_blockers(self):
        ids = ["data-engine", "developer-page", "coding-for-engineers", "sitemap"]
        result = classify(self.report([row(x, 404, 200) for x in ids]))
        self.assertEqual(result["classification"], "public_route_degraded")
        self.assertEqual(result["confirmed_public_404_or_410_vs_origin_200"], sorted(ids))
        self.assertFalse(result["release_clearance"])
        self.assertFalse(result["deployed_commit_verified"])

    def test_410_is_also_missing_but_403_is_not(self):
        result = classify(self.report([row("gone", 410, 200), row("forbidden", 403, 200)]))
        self.assertEqual(result["confirmed_public_404_or_410_vs_origin_200"], ["gone"])
        self.assertEqual(result["other_origin_divergence_ids"], ["forbidden"])

    def test_unavailable_network_control_does_not_claim_outage(self):
        result = classify(self.report([row("sitemap", 404, 200)], control=None))
        self.assertEqual(result["classification"], "measurement_unconfirmed")
        self.assertEqual(result["confirmed_public_404_or_410_vs_origin_200"], [])
        self.assertTrue(result["not_global_outage_evidence"])

    def test_failed_probe_or_absent_comparisons_remains_unverified(self):
        result = classify(self.report([row("sitemap", None, 200)]))
        self.assertEqual(result["classification"], "measurement_unconfirmed")
        self.assertEqual(result["unmeasured_comparison_ids"], ["sitemap"])
        self.assertEqual(classify(self.report([]))["classification"], "measurement_unconfirmed")

    def test_successful_equal_http_bodies_do_not_grant_release_clearance(self):
        result = classify(self.report([row("main", 200, 200)]))
        self.assertEqual(result["classification"], "measured_routes_match")
        self.assertFalse(result["release_clearance"])

    def test_matching_status_different_bodies_are_not_release_ready(self):
        result = classify(self.report([row("main", 200, 200, body_mismatch=True)]))
        self.assertEqual(result["classification"], "origin_divergence")
        self.assertEqual(result["other_origin_divergence_ids"], ["main"])


if __name__ == "__main__":
    unittest.main()
