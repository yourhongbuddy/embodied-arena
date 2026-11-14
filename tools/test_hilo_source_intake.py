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
                    self.assertIn(parsed.hostname, h.ALLOWED_HOSTS | {"alignment.openai.com"})
                    # The extra official blog host is approved for *staging* only;
                    # worker manifest admission still uses h.ALLOWED_HOSTS.
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

    def test_layered_monitoring_primary_publication_date_corrected(self):
        intake = json.loads((h.ROOT / "config/hilo-source-intake-20261030.json").read_text(encoding="utf-8"))
        row = next(item for item in intake["candidates"]
                   if item["id"] == "openai-frontier-misalignment-layered-monitoring-20261028")
        self.assertEqual(row["published_on"], "2026-10-29")
        self.assertEqual(row["retrieved_on"], "2026-10-30")
        self.assertIn("2026-11-02", row["provenance_correction"])
        self.assertEqual(row["admission_status"], "proposed")
        self.assertFalse(row["consumed_by_workers"])
        self.assertFalse(intake["automatic_promotion"])

    def test_prior_rle_bench_intake_remains_staged(self):
        prior = json.loads((h.ROOT / "config/hilo-source-intake-20260923.json").read_text(encoding="utf-8"))
        row = next(item for item in prior["candidates"] if item["id"] == "rle-bench-robot-learning-engineers")
        self.assertEqual(row["admission_target"], "reference_sources")
        self.assertFalse(row["consumed_by_workers"])

    def test_latest_intake_stages_third_party_assessment_principles(self):
        latest = json.loads((h.ROOT / "config/hilo-source-intake-20260925.json").read_text(encoding="utf-8"))
        row = next(item for item in latest["candidates"] if item["id"] == "openai-third-party-assessment-principles")
        self.assertEqual(row["publisher"], "OpenAI")
        self.assertEqual(row["published_on"], "2026-09-22")
        self.assertEqual(row["retrieved_on"], "2026-09-25")
        self.assertFalse(row["consumed_by_workers"])
        self.assertEqual(row["admission_target"], "worker_sources")
        self.assertIn("independent", row["finding"].lower())
        self.assertIn("not a certification", row["hilo_adaptation"])



    def test_november_eval_transfer_and_lifeval_remain_unconsumed(self):
        intake = json.loads((h.ROOT / "config/hilo-source-intake-20261104.json").read_text(encoding="utf-8"))
        self.assertFalse(intake["automatic_promotion"])
        self.assertEqual(intake["review_date"], "2026-11-04")
        self.assertEqual({row["id"] for row in intake["candidates"]}, {
            "openai-alignment-eval-production-gap-20261103",
            "openai-lifeval-everyday-task-priorities-20261102"})
        for row in intake["candidates"]:
            self.assertEqual(row["admission_status"], "proposed")
            self.assertFalse(row["consumed_by_workers"])
            self.assertEqual(row["rights_scope"], "method_reference_only")
            self.assertEqual(row["admission_target"], "worker_sources")
        self.assertIn("predecision", intake["candidates"][0]["hilo_adaptation"])
        self.assertIn("WANTED scoring", intake["candidates"][1]["hilo_adaptation"])

    def test_november_biobasicsbench_is_method_only_not_robot_evidence(self):
        intake = json.loads((h.ROOT / "config/hilo-source-intake-20261107.json").read_text(encoding="utf-8"))
        self.assertFalse(intake["automatic_promotion"])
        self.assertEqual(len(intake["candidates"]), 1)
        source = intake["candidates"][0]
        self.assertEqual(source["published_on"], "2026-11-06")
        self.assertEqual(source["retrieved_on"], "2026-11-07")
        self.assertEqual(source["admission_status"], "proposed")
        self.assertFalse(source["consumed_by_workers"])
        self.assertEqual(source["rights_scope"], "method_reference_only")
        self.assertIn("whole deployment/environment units", source["hilo_adaptation"])
        self.assertIn("100 worker jobs", source["hilo_adaptation"])
        self.assertIn("human", source["hilo_adaptation"])
        self.assertEqual(len(h.make_plan(h.load_manifest(self.manifest_path))["jobs"]), 100)



    def test_november_monitorability_method_is_proposed_and_not_robot_evidence(self):
        intake = json.loads((h.ROOT / "config/hilo-source-intake-20261111.json").read_text(encoding="utf-8"))
        self.assertFalse(intake["automatic_promotion"])
        self.assertEqual(intake["review_date"], "2026-11-11")
        self.assertEqual(len(intake["candidates"]), 1)
        candidate = intake["candidates"][0]
        self.assertEqual(candidate["published_on"], "2026-11-10")
        self.assertEqual(candidate["retrieved_on"], "2026-11-11")
        self.assertEqual(candidate["admission_status"], "proposed")
        self.assertFalse(candidate["consumed_by_workers"])
        self.assertEqual(candidate["rights_scope"], "method_reference_only")
        self.assertIn("observable actions", candidate["hilo_adaptation"])
        self.assertIn("hidden reasoning traces", candidate["hilo_adaptation"])
        manifest = h.load_manifest(self.manifest_path)
        planned = h.make_plan(manifest)
        self.assertEqual(len(planned["jobs"]), 100)
        self.assertNotIn(candidate["id"], {sid for job in planned["jobs"] for sid in job["source_ids"]})



    def test_november_fuzzy_robustness_stays_synthetic_and_unconsumed(self):
        intake = json.loads((h.ROOT / "config/hilo-source-intake-20261114.json").read_text(encoding="utf-8"))
        self.assertFalse(intake["automatic_promotion"])
        row = intake["candidates"][0]
        self.assertEqual(row["published_on"], "2026-11-12")
        self.assertEqual(row["retrieved_on"], "2026-11-14")
        self.assertEqual(row["admission_status"], "proposed")
        self.assertFalse(row["consumed_by_workers"])
        self.assertEqual(row["rights_scope"], "method_reference_only")
        self.assertIn("synthetic-only", row["hilo_adaptation"])
        self.assertIn("sealed holdouts", row["hilo_adaptation"])
        self.assertIn("human", row["hilo_adaptation"])
        plan = h.make_plan(h.load_manifest(self.manifest_path))
        self.assertEqual(len(plan["jobs"]), 100)
        self.assertNotIn(row["id"], {sid for job in plan["jobs"] for sid in job["source_ids"]})


if __name__ == "__main__":
    unittest.main()
