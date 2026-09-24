import json
import unittest
from pathlib import Path
from urllib.parse import urlparse
import hilo_data_engine as h


class DailySourceIntakeTests(unittest.TestCase):
    def setUp(self):
        self.manifest_path = h.ROOT / "config/hilo-data-engine.json"
        self.intake_paths = sorted((h.ROOT / "config").glob("hilo-source-intake-*.json"))
        self.manifest = json.loads(self.manifest_path.read_text(encoding="utf-8"))
        self.intakes = [json.loads(path.read_text(encoding="utf-8")) for path in self.intake_paths]

    def test_all_dated_intakes_are_staged_and_non_executing(self):
        self.assertGreaterEqual(len(self.intakes), 1)
        for intake in self.intakes:
            self.assertEqual(intake.get("intake_version"), "0.1")
            self.assertRegex(intake.get("review_date", ""), r"^\d{4}-\d{2}-\d{2}$")
            self.assertFalse(intake.get("automatic_promotion", True))
            rows = intake.get("candidates", [])
            self.assertGreaterEqual(len(rows), 1)
            for row in rows:
                self.assertEqual(row.get("admission_status"), "proposed")
                self.assertFalse(row.get("consumed_by_workers", True))
                self.assertEqual(row.get("rights_scope"), "method_reference_only")
                self.assertIn(row.get("admission_target"), {"worker_sources", "reference_sources"})

    def test_all_staged_ids_are_unique_and_absent_from_current_worker_plan(self):
        staged_ids = [row["id"] for intake in self.intakes for row in intake["candidates"]]
        self.assertEqual(len(staged_ids), len(set(staged_ids)))
        manifest_ids = {row["id"] for row in self.manifest.get("sources", [])}
        reference_ids = {row["id"] for row in self.manifest.get("reference_sources", [])}
        self.assertFalse(set(staged_ids) & manifest_ids)
        self.assertFalse(set(staged_ids) & reference_ids)
        used = {
            source_id
            for job in h.make_plan(h.load_manifest(self.manifest_path))["jobs"]
            for source_id in job["source_ids"]
        }
        self.assertFalse(set(staged_ids) & used)

    def test_primary_source_routing_and_dates_across_every_intake(self):
        for intake in self.intakes:
            for row in intake["candidates"]:
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

    def test_reviewed_nonadmission_is_explicit_for_every_intake(self):
        for intake in self.intakes:
            rows = intake.get("reviewed_not_admitted", [])
            self.assertGreaterEqual(len(rows), 1)
            for row in rows:
                self.assertTrue(row.get("title"))
                self.assertTrue(row.get("url", "").startswith("https://"))
                self.assertRegex(row.get("retrieved_on", ""), r"^\d{4}-\d{2}-\d{2}$")
                self.assertTrue(row.get("reason"))

    def test_latest_intake_records_mentalhealthbench_without_worker_promotion(self):
        latest = json.loads((h.ROOT / "config/hilo-source-intake-20260924.json").read_text(encoding="utf-8"))
        row = next(item for item in latest["candidates"] if item["id"] == "openai-mentalhealthbench-expert-rubrics")
        self.assertEqual(row["admission_target"], "worker_sources")
        self.assertFalse(row["consumed_by_workers"])
        self.assertEqual(row["publisher"], "OpenAI")
        self.assertEqual(row["published_on"], "2026-09-23")
        self.assertEqual(row["retrieved_on"], "2026-09-24")
        self.assertIn("at least three experts", row["finding"])
        self.assertIn("non-ranking diagnostic", row["hilo_adaptation"])

    def test_prior_rle_bench_intake_remains_staged(self):
        prior = json.loads((h.ROOT / "config/hilo-source-intake-20260923.json").read_text(encoding="utf-8"))
        row = next(item for item in prior["candidates"] if item["id"] == "rle-bench-robot-learning-engineers")
        self.assertEqual(row["admission_target"], "reference_sources")
        self.assertFalse(row["consumed_by_workers"])


if __name__ == "__main__":
    unittest.main()
