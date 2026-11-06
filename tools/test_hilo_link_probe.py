"""Offline-only WANTED documentation-link checks: no network or private content."""
import unittest
from hilo_link_probe import allowed_path, probe_inventory


class DocLinkProbeTests(unittest.TestCase):
    def test_only_visible_unverified_wanted_docs_are_probed(self):
        inventory = {"same_origin_links": [
            {"path": "/wanted-10k/audit-sdk", "checked": False,
             "http_status_from_existing_probe": None},
            {"path": "/wanted-10k/audit-sdk", "checked": False,
             "http_status_from_existing_probe": None},
            {"path": "/wanted-10k/protocol", "checked": True,
             "http_status_from_existing_probe": 200},
            {"path": "/wanted-10k/old", "checked": True,
             "http_status_from_existing_probe": 404},
            {"path": "/agents", "checked": False},
            {"path": "/api/private", "checked": False},
            {"path": "/wanted-10k/openapi.json", "checked": False,
             "http_status_from_existing_probe": None}]}
        called = []
        report = probe_inventory(inventory, fetch=lambda path: called.append(path) or 200)
        self.assertEqual(called, ["/wanted-10k/audit-sdk", "/wanted-10k/openapi.json"])
        self.assertEqual(report["probed"], 2)
        self.assertEqual(report["result_counts"]["http_success"], 2)

    def test_bounded_requests_and_no_retries(self):
        items = [{"path": f"/wanted-10k/doc-{i}", "checked": False,
                  "http_status_from_existing_probe": None} for i in range(32)]
        called = []
        report = probe_inventory({"same_origin_links": items},
                                 fetch=lambda path: called.append(path) or 200)
        self.assertEqual(len(called), 16)
        self.assertEqual(report["unprobed_eligible"], 16)
        self.assertTrue(report["not_a_full_crawl"])
        with self.assertRaises(ValueError):
            probe_inventory({"same_origin_links": items}, limit=17)

    def test_missing_is_not_confused_with_redirect_or_network_failure(self):
        statuses = {"/wanted-10k/a": 206, "/wanted-10k/b": 404,
                    "/wanted-10k/c": 410, "/wanted-10k/d": 302,
                    "/wanted-10k/e": 403, "/wanted-10k/f": None}
        data = {"same_origin_links": [{"path": path, "checked": False,
                                       "http_status_from_existing_probe": None}
                                      for path in statuses]}
        report = probe_inventory(data, fetch=statuses.__getitem__)
        self.assertEqual(report["confirmed_missing"], ["/wanted-10k/b", "/wanted-10k/c"])
        self.assertEqual(report["result_counts"],
                         {"http_success": 1, "http_missing": 2,
                          "http_other": 2, "measurement_failed": 1})

    def test_url_and_private_path_rejection(self):
        forbidden = ["/wanted-10k/../api", "/wanted-10k//abc",
                     "/wanted-10k/doc?token=secret", "/wanted-10k/doc#frag",
                     "https://getrobotrouter.com/wanted-10k/doc",
                     "//attacker.example/wanted-10k/a", "/wanted-10k/a/b",
                     "/admin", "/wanted-10k/%2e%2e", "/wanted-10k/Abc",
                     "/wanted-10k/doc/"]
        self.assertTrue(all(not allowed_path(path) for path in forbidden))
        self.assertTrue(allowed_path("/wanted-10k/protocol"))
        self.assertTrue(allowed_path("/wanted-10k/event.schema.json") is False)
        report = probe_inventory({"same_origin_links": [{"path": path, "checked": False}
                                  for path in forbidden]}, fetch=lambda _: 200)
        self.assertEqual(report["probed"], 0)
        self.assertNotIn("secret", str(report))

    def test_errors_and_invalid_inventory_are_explicit(self):
        def fail(_):
            raise OSError("network down")
        data = {"same_origin_links": [{"path": "/wanted-10k/sdk", "checked": False,
                                       "http_status_from_existing_probe": None}]}
        report = probe_inventory(data, fetch=fail)
        self.assertEqual(report["result_counts"]["measurement_failed"], 1)
        self.assertFalse(report["confirmed_missing"])
        with self.assertRaises(ValueError):
            probe_inventory({"same_origin_links": "wrong"})


if __name__ == "__main__":
    unittest.main()
