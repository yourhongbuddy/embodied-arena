"""Offline static-asset probe tests: no real network or robot data."""
import unittest
from hilo_asset_probe import allowed_asset_path, probe_inventory


class AssetProbeTests(unittest.TestCase):
    def test_bounded_and_deduplicated(self):
        inventory = {"same_origin_assets": [
            {"path": "/_next/static/a.js"}, {"path": "/_next/static/a.js"},
            {"path": "/_next/static/b.css"}, {"path": "/images/logo.png"}]}
        seen = []
        result = probe_inventory(inventory, fetch=lambda p: seen.append(p) or 200, limit=2)
        self.assertEqual(seen, ["/_next/static/a.js", "/_next/static/b.css"])
        self.assertEqual(result["probed"], 2)
        self.assertEqual(result["unprobed_eligible"], 1)
        self.assertFalse(result["confirmed_missing"])

    def test_http_missing_only_explicit_404_or_410(self):
        statuses = {"/_next/static/ok.js": 206, "/_next/static/no.js": 404,
                    "/_next/static/blocked.js": 403, "/_next/static/moved.js": 302,
                    "/_next/static/noanswer.js": None}
        inv = {"same_origin_assets": [{"path": p} for p in statuses]}
        result = probe_inventory(inv, fetch=statuses.__getitem__)
        self.assertEqual(result["confirmed_missing"], ["/_next/static/no.js"])
        self.assertEqual(sum(x["result"] == "http_other" for x in result["results"]), 2)
        self.assertEqual(sum(x["result"] == "measurement_failed" for x in result["results"]), 1)
        self.assertEqual(result["result_counts"], {"http_success": 1, "http_missing": 1,
                                                  "http_other": 2, "measurement_failed": 1})

    def test_reject_arbitrary_dynamic_and_sensitive_urls(self):
        excluded = ["/_next/image", "/api/private", "/_next/static/../secret",
                    "/_next/static/%2e%2e/secret", "/_next/static/a.js?token=secret",
                    "https://getrobotrouter.com/_next/static/a.js",
                    "/_next/static/a\\\\b", "//evil.example/a", "/_next/static//a.js"]
        self.assertTrue(all(not allowed_asset_path(x) for x in excluded))
        inv = {"same_origin_assets": [{"path": x} for x in excluded] +
               [{"path": "/_next/static/safe.js"}]}
        result = probe_inventory(inv, fetch=lambda _: 200)
        self.assertEqual(result["probed"], 1)
        self.assertNotIn("secret", str(result))
        self.assertNotIn("evil.example", str(result))

    def test_network_error_is_unverified(self):
        def fail(_):
            raise OSError("connection refused")
        result = probe_inventory({"same_origin_assets": [{"path": "/assets/a.png"}]},
                                 fetch=fail)
        self.assertEqual(result["results"][0]["result"], "measurement_failed")
        self.assertFalse(result["confirmed_missing"])

    def test_invalid_limit_and_inventory(self):
        with self.assertRaises(ValueError):
            probe_inventory({"same_origin_assets": []}, limit=21)
        with self.assertRaises(ValueError):
            probe_inventory({"same_origin_assets": "untrusted"})

if __name__ == "__main__":
    unittest.main()
