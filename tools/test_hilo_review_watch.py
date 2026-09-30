import copy
import json
from pathlib import Path
import tempfile
import unittest
import hilo_review_watch as rw

ROOT = Path(__file__).resolve().parents[1]
FEED = ROOT / 'public/hilo/review-watch.json'


class ReviewWatchTests(unittest.TestCase):
    def setUp(self):
        self.feed = rw.load(FEED)

    def test_real_seed_counts_and_boundaries(self):
        result = rw.validate(self.feed)
        self.assertGreaterEqual(result['valid_records'], 14)
        self.assertEqual(result['targets'], 21)
        self.assertEqual(result['network_requests'], 0)
        self.assertEqual(result['independently_verified_incidents'], 0)

    def test_three_platforms_and_seven_brands(self):
        self.assertEqual({x['brand'] for x in self.feed['observations']}, rw.BRANDS)
        self.assertEqual({x['platform'] for x in self.feed['observations']}, rw.PLATFORMS)

    def test_missing_coverage_is_retained(self):
        pending = [x for x in self.feed['targets'] if x['url'] is None]
        self.assertTrue(all(x['state'] in {'discovery_pending', 'access_incomplete'} for x in pending))
        self.feed['targets'].pop()
        with self.assertRaises(ValueError):
            rw.validate(self.feed)

    def test_old_featured_review_is_not_new(self):
        self.assertEqual(rw.age_bucket(self.feed['observations'][0], '2026-09-30'), 'Historical backfill')
        self.assertEqual(rw.age_bucket(self.feed['observations'][5], '2026-09-30'), 'Published within 30 days')

    def test_relative_date_is_not_inferred(self):
        r = self.feed['observations'][6]
        self.assertEqual(r['experience_on'], '2026-09-27')
        self.assertIsNone(r['published_on'])
        self.assertEqual(rw.age_bucket(r, '2026-09-30'), 'Publication date unverified')

    def test_vendor_claim_is_not_owner_evidence(self):
        r = self.feed['observations'][2]
        self.assertEqual(r['novelty'], 'vendor_claim')
        r['evidence_class'] = 'owner_report'
        with self.assertRaises(ValueError):
            rw.validate(self.feed)

    def test_positive_and_contrary_reports_survive(self):
        labels = {x['novelty'] for x in self.feed['observations']}
        self.assertTrue({'positive_control', 'counterevidence'}.issubset(labels))
        self.assertIn('RW-20260930-006', self.feed['observations'][4]['related_ids'])

    def test_unknown_fields_cannot_invent_robot_hours(self):
        self.feed['observations'][0]['robot_hours'] = 10000
        with self.assertRaises(ValueError):
            rw.validate(self.feed)

    def test_only_existing_candidate_ids(self):
        self.feed['observations'][0]['hilo_ids'] = ['HILO-999']
        with self.assertRaises(ValueError):
            rw.validate(self.feed)

    def test_app_identity_and_platform_enforced(self):
        self.feed['observations'][0]['app_id'] = 'wrong.app'
        with self.assertRaises(ValueError):
            rw.validate(self.feed)
        for value in ['javascript:alert(1)', 'https://apps.apple.com.evil.test/us/app/id123', 'https://u:p@apps.apple.com/us/app/id123']:
            with self.assertRaises(ValueError):
                rw.source_url(value, 'ios')

    def test_real_dates_required(self):
        for value in ['2026-02-30', 'yesterday', '2026-9-3']:
            with self.assertRaises(ValueError):
                rw.day(value)
        self.feed['observations'][0]['published_on'] = '2030-01-01'
        with self.assertRaises(ValueError):
            rw.validate(self.feed)

    def test_duplicate_source_and_ids_rejected(self):
        other = copy.deepcopy(self.feed['observations'][0])
        other['id'] = 'RW-20260930-099'
        self.feed['observations'].append(other)
        with self.assertRaises(ValueError):
            rw.validate(self.feed)

    def test_append_only_revision_lineage(self):
        original = self.feed['observations'][0]
        amended = copy.deepcopy(original)
        amended.update(id=original['id'] + '-r2', revision=2, supersedes=original['id'], summary='Corrected original summary.')
        self.feed['observations'].append(amended)
        self.assertEqual(rw.validate(self.feed)['valid_records'], len(self.feed['observations']))
        amended['revision'] = 3
        with self.assertRaises(ValueError):
            rw.validate(self.feed)

    def test_crosslinks_must_exist(self):
        self.feed['observations'][0]['related_ids'] = ['RW-20990101-999']
        with self.assertRaises(ValueError):
            rw.validate(self.feed)

    def test_json_duplicate_keys_rejected(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / 'bad.json'
            path.write_text('{"schema_version":1,"schema_version":2}')
            with self.assertRaisesRegex(ValueError, 'Duplicate JSON key'):
                rw.load(path)

    def test_page_is_reproducible_and_does_not_interpret_review_html(self):
        page = rw.render(self.feed)
        self.assertEqual(page, (ROOT / 'public/hilo/review-watch.html').read_text())
        self.assertNotIn('innerHTML', page)
        self.assertNotIn('eval(', page)
        self.assertIn('textContent', page)
        self.assertIn('<noscript>', page)
        self.assertIn('do not treat this as an empty feed', page)
        self.feed['observations'][0]['summary'] = '<img src=x onerror=alert(1)>'
        self.assertNotIn('<img src=x', rw.render(self.feed))


if __name__ == '__main__':
    unittest.main()
