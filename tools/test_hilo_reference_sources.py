import json
import unittest
from pathlib import Path
import hilo_data_engine as h


class ReferenceSourceBoundaryTests(unittest.TestCase):
    def setUp(self):
        self.path = h.ROOT / "config/hilo-data-engine.json"
        self.manifest = json.loads(self.path.read_text(encoding="utf-8"))
        self.worker_sources = self.manifest.get("sources", [])
        self.references = self.manifest.get("reference_sources", [])

    def test_reference_sources_are_separately_attributed(self):
        self.assertGreaterEqual(len(self.references), 4)
        publishers = {row.get("publisher") for row in self.references}
        for required in {"Stanford BEHAVIOR", "Harvard DASH", "Oxford Robotics Institute", "NVIDIA", "Figure"}:
            self.assertIn(required, publishers)
        for row in self.references:
            self.assertTrue(row.get("publisher"))
            self.assertTrue(row.get("retrieved_on"))
            self.assertEqual(row.get("rights_scope"), "method_reference_only")
            self.assertFalse(row.get("consumed_by_workers", True))

    def test_worker_plan_does_not_implicitly_consume_external_references(self):
        loaded = h.load_manifest(self.path)
        plan = h.make_plan(loaded)
        worker_ids = {source["id"] for source in self.worker_sources}
        reference_ids = {source["id"] for source in self.references}
        used = {source_id for job in plan["jobs"] for source_id in job["source_ids"]}
        self.assertTrue(used)
        self.assertTrue(used <= worker_ids)
        self.assertFalse(used & reference_ids)

    def test_new_openai_method_cards_enter_worker_evidence_pool(self):
        source_ids = {source["id"] for source in self.worker_sources}
        for required in {
            "summary-feedback-quality",
            "rule-based-rewards",
            "collective-alignment",
            "economic-research-exchange",
        }:
            self.assertIn(required, source_ids)
        used = {source_id for job in h.make_plan(h.load_manifest(self.path))["jobs"] for source_id in job["source_ids"]}
        self.assertTrue({"summary-feedback-quality", "rule-based-rewards", "collective-alignment"} <= used)

    def test_retrieval_dates_and_urls_are_explicit(self):
        seen = set()
        for row in self.worker_sources + self.references:
            self.assertNotIn(row["id"], seen)
            seen.add(row["id"])
            self.assertTrue(row["url"].startswith("https://"))
            retrieved = row.get("retrieved_on")
            self.assertRegex(retrieved or "", r"^\d{4}-\d{2}-\d{2}$")
            if row.get("published_on") is not None:
                self.assertRegex(row["published_on"], r"^\d{4}(?:-\d{2})?(?:-\d{2})?$")


if __name__ == "__main__":
    unittest.main()
