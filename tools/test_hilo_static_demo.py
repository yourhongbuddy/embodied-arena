"""Offline-only source-integrity checks for the unpublished static demo."""
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]
PAGE = ROOT / "distribution/hf-static-demo/index.html"
README = PAGE.with_name("README.md")

class Tags(HTMLParser):
    def __init__(self):
        super().__init__(); self.tags=[]
    def handle_starttag(self, tag, attrs):
        self.tags.append((tag,dict(attrs)))

class StaticDemoTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.html=PAGE.read_text(encoding="utf-8")
        cls.readme=README.read_text(encoding="utf-8")
        cls.fixture=json.loads(re.search(r'<script type="application/json" id="synthetic-data">([^<]+)</script>',cls.html).group(1))

    def test_synthetic_only_not_certification(self):
        self.assertEqual(self.fixture["evidence_class"],"synthetic_example")
        self.assertEqual(self.fixture["claimed_robot_hours"],0)
        self.assertIs(self.fixture["wants_certification"],False)
        self.assertIn("Verified field hours: 0",self.html)
        self.assertIn("Certification: none",self.html)

    def test_six_events_and_intervention_count(self):
        classes=[e["event_class"] for e in self.fixture["events"]]
        self.assertEqual(classes,["DEPLOYMENT_LIFECYCLE","ROBOT_STATE","HUMAN_REQUEST","ROBOT_ACTION","HUMAN_INTERVENTION","INCIDENT"])
        self.assertEqual(sum(e.get("human_assistance_seconds",0) for e in self.fixture["events"]),45)
        self.assertTrue(all("human_assistance_seconds" not in e for e in self.fixture["events"] if e["event_class"]!="HUMAN_INTERVENTION"))

    def test_no_uploads_external_assets_or_network(self):
        tags=Tags();tags.feed(self.html)
        self.assertFalse(any(tag in ("form","iframe","img","link","video","audio") for tag,_ in tags.tags))
        self.assertFalse(any(tag=="script" and "src" in attrs for tag,attrs in tags.tags))
        self.assertNotRegex(self.html,r"\b(?:fetch|XMLHttpRequest|sendBeacon|localStorage|sessionStorage|WebSocket)\s*\(")
        self.assertIn("connect-src 'none'",self.html)
        self.assertIn("noindex,nofollow",self.html)

    def test_staging_not_published_and_review_gated(self):
        self.assertIn("sdk: static",self.readme)
        self.assertIn("app_file: index.html",self.readme)
        self.assertIn("repository staging only",self.readme)
        self.assertIn("license and publisher authorization",self.readme)

    def test_accessible_fallback(self):
        self.assertIn('lang="en"',self.html)
        self.assertIn('aria-live="polite"',self.html)
        self.assertIn("<noscript>",self.html)

if __name__=="__main__":
    unittest.main()
