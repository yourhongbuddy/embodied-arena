"""Offline tests; no network requests or robot data."""
import unittest
from hilo_browser_links import summarize, public_path


class BrowserLinkTests(unittest.TestCase):
    def test_broken_link_only_when_actual_probe_was_404(self):
        page = ('<a href="/wanted-10k/data-engine.html">Data engine</a>'
                '<a href="/wanted-10k/sdk?src=internal#start">SDK</a>'
                '<a href="mailto:person@example.com">Email</a>'
                '<a href="https://external.example/private">External</a>'
                '<script src="/_next/static/app.js?token=secret"></script>'
                '<link rel="stylesheet" href="/_next/static/app.css">'
                '<img src="/images/logo.png">')
        report = {"records": [
            {"result": {"measurement": {"url": "https://getrobotrouter.com/wanted-10k/data-engine.html",
                                        "status_code": 404}}},
            {"result": {"measurement": {"url": "https://getrobotrouter.com/wanted-10k/sdk",
                                        "status_code": 200}}},
        ]}
        result = summarize(page, report)
        self.assertEqual(result["broken_link_paths_confirmed_by_existing_probes"],
                         ["/wanted-10k/data-engine.html"])
        self.assertEqual(result["unverified_asset_count"], 3)
        self.assertEqual(result["unverified_link_count"], 0)
        self.assertTrue(result["not_a_full_crawl"])
        self.assertNotIn("secret", str(result))
        self.assertNotIn("external.example", str(result))
        self.assertNotIn("person@example.com", str(result))

    def test_gone_410_is_confirmed_broken_but_403_is_not(self):
        page = ('<a href="/wanted-10k/gone">Gone</a>'
                '<a href="/wanted-10k/forbidden">Forbidden</a>')
        report = {"records": [
            {"result": {"measurement": {"url": "https://getrobotrouter.com/wanted-10k/gone",
                                        "status_code": 410}}},
            {"result": {"measurement": {"url": "https://getrobotrouter.com/wanted-10k/forbidden",
                                        "status_code": 403}}},
        ]}
        result = summarize(page, report)
        self.assertEqual(result["broken_link_paths_confirmed_by_existing_probes"],
                         ["/wanted-10k/gone"])
        self.assertEqual(result["unverified_link_count"], 0)
        self.assertTrue(all(x["checked"] for x in result["same_origin_links"]))

    def test_unprobed_and_failed_measurements_are_not_broken_link_proof(self):
        page = '<a href="/wanted-10k/missing">Missing?</a>'
        report = {"records": [
            {"result": {"measurement": {"url": "https://getrobotrouter.com/wanted-10k/missing",
                                        "status_code": None}}},
        ]}
        result = summarize(page, report)
        self.assertEqual(result["broken_link_paths_confirmed_by_existing_probes"], [])
        self.assertEqual(result["unverified_link_count"], 1)
        self.assertFalse(result["same_origin_links"][0]["checked"])

    def test_rejects_external_http_credentials_and_userinfo(self):
        for ref in ("https://other.example/a", "http://getrobotrouter.com/a",
                    "https://user:secret@getrobotrouter.com/a", "mailto:x@example.com"):
            self.assertIsNone(public_path(ref, "https://getrobotrouter.com/wanted-10k"))
        self.assertEqual(public_path("/wanted-10k/sdk?x=secret#fragment",
                                     "https://getrobotrouter.com/wanted-10k"),
                         "/wanted-10k/sdk")

    def test_malformed_public_href_does_not_abort_inventory(self):
        malformed = ("https://[invalid/a", "https://getrobotrouter.com:invalid/a",
                     "https://getrobotrouter.com:999999/a", "//[::1")
        for ref in malformed:
            with self.subTest(ref=ref):
                self.assertIsNone(public_path(ref, "https://getrobotrouter.com/wanted-10k"))
        self.assertIsNone(public_path(None, "https://getrobotrouter.com/wanted-10k"))
        page = ('<a href="https://[invalid/a">Broken URL</a>'
                '<a href="https://getrobotrouter.com:invalid/a">Bad port</a>'
                '<a href="/wanted-10k/protocol?secret=discard">Protocol</a>'
                '<script src="https://getrobotrouter.com:999999/static/app.js"></script>')
        observed = summarize(page, {"records": []})
        self.assertEqual([r["path"] for r in observed["same_origin_links"]],
                         ["/wanted-10k/protocol"])
        self.assertEqual(observed["same_origin_assets"], [])
        self.assertNotIn("secret", str(observed))
        self.assertEqual(observed["unverified_link_count"], 1)



if __name__ == "__main__":
    unittest.main()
