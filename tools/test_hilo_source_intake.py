import json
import unittest
from pathlib import Path
from urllib.parse import urlparse
import hilo_data_engine as h


class DailySourceIntakeTests(unittest.TestCase):
    def setUp(self):
        self.manifest_path = h.ROOT / "config/hilo-data-engine.json"
        self.intake_path = h.ROOT / "config/hilo-source-intake-20260922.json"
        self.manifest = json.loads(self.manifest_path.read_text(encoding="utf-8"))
        self.intake = json.loads(self.intake_path.read_text(encoding="utf-8"))

    def test_intake_is_staged_and_non_executing(self):
        self.assertEqual(self.intake.get("intake_version"), "0.1")
        self.assertEqual(self.intake.get("review_date"), "2026-09-22")
        self.assertFalse(self.intake.get("automatic_promotion", True))
        rows = self.intake.get("candidates", [])
        self.assertGreaterEqual(len(rows), 1)
        for row in rows:
            self.assertEqual(row.get("admission_status"), "proposed")
            self.assertFalse(row.get("consumed_by_workers", True))
            self.assertEqual(row.get("rights_scope"), "method_reference_only")
            self.assertIn(row.get("admission_target"), {"worker_sources", "reference_sources"})

    def test_intake_ids_do_not_enter_current_worker_plan(self):
        staged_ids = {row["id"] for row in self.intake["candidates"]}
        manifest_ids = {row["id"] for row in self.manifest.get("sources", [])}
        reference_ids = {row["id"] for row in self.manifest.get("reference_sources", [])}
        self.assertFalse(staged_ids & manifest_ids)
        self.assertFalse(staged_ids & reference_ids)
        used = {
            source_id
            for job in h.make_plan(h.load_manifest(self.manifest_path))["jobs"]
            for source_id in job["source_ids"]
        }
        self.assertFalse(staged_ids & used)

    def test_primary_source_routing_and_dates(self):
        for row in self.intake["candidates"]:
            self.assertRegex(row.get("retrieved_on", ""), r"^\d{4}-\d{2}-\d{2}$")
            self.assertRegex(row.get("published_on", ""), r"^\d{4}-\d{2}-\d{2}$")
            parsed = urlparse(row["url"])
            self.assertEqual(parsed.scheme, "https")
            self.assertTrue(parsed.hostname)
            self.assertTrue(row.get("publisher"))
            self.assertTrue(row.get("finding"))
            self.assertTrue(row.get("hilo_adaptation"))
            if row["publisher"] == "OpenAI":
                self.assertIn(parsed.hostname, h.ALLOWED_HOSTS)
                self.assertEqual(row["admission_target"], "worker_sources")
                self.assertEqual(row["evidence_class"], "public_primary_source")
            else:
                self.assertEqual(row["admission_target"], "reference_sources")
                self.assertEqual(row["evidence_class"], "external_public_primary_source")

    def test_reviewed_nonadmission_is_explicit(self):
        rows = self.intake.get("reviewed_not_admitted", [])
        self.assertGreaterEqual(len(rows), 1)
        for row in rows:
            self.assertTrue(row.get("title"))
            self.assertTrue(row.get("url", "").startswith("https://"))
            self.assertRegex(row.get("retrieved_on", ""), r"^\d{4}-\d{2}-\d{2}$")
            self.assertTrue(row.get("reason"))


if __name__ == "__main__":
    unittest.main()
