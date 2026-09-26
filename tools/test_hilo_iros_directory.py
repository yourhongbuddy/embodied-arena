import copy,json,tempfile,unittest
from pathlib import Path
from unittest.mock import patch
import hilo_iros_directory as d

class DirectoryTests(unittest.TestCase):
    def setUp(self):
        self.seed=d.expand_seed(json.loads((d.DIR/'seed.json').read_text()))
        self.paper={'paper_number':'1','title':'A robot study','authors':[{'name':'Example, Alex','aff':'Example University'}],'keywords':['Robotics']}
    def test_seed_has_no_fake_person_heading(self):
        self.assertFalse(any('Initiative' in p['name'] for p in self.seed['people_assertions']))
    def test_parse_only_data_block(self):
        html='<script>throw new Error();</script><script id="papers-data" type="application/json">'+json.dumps([self.paper])+'</script>'
        with patch.object(d,'EXPECTED_PAPERS',1):self.assertEqual(d.parse_program(html)[0]['paper_number'],'1')
    def test_missing_data_rejected(self):
        with self.assertRaises(ValueError):d.parse_program('<html>No data</html>')
    def test_count_change_rejected(self):
        with self.assertRaises(ValueError):d.parse_program('<script id="papers-data" type="application/json">[]</script>')
    def test_duplicate_paper_rejected(self):
        x='<script id="papers-data" type="application/json">'+json.dumps([self.paper,self.paper])+'</script>'
        with patch.object(d,'EXPECTED_PAPERS',2),self.assertRaises(ValueError):d.parse_program(x)
    def test_duplicate_person_same_aff_deduplicated(self):
        p=copy.deepcopy(self.paper);p['authors']*=2
        out=d.build([p],self.seed);r=[x for x in out['people'] if x['name']=='Example, Alex'];self.assertEqual(len(r),1)
    def test_same_name_different_aff_not_merged(self):
        p=copy.deepcopy(self.paper);p['authors'].append({'name':'Example, Alex','aff':'Different University'})
        r=[x for x in d.build([p],self.seed)['people'] if x['name']=='Example, Alex'];self.assertEqual(len(r),2);self.assertTrue(all(x['identity_review_required'] for x in r))
    def test_source_unknown_rejected(self):
        self.seed['people_assertions'][0]['source_id']='invented'
        with self.assertRaises(ValueError):d.build([self.paper],self.seed)
    def test_contact_detail_omitted(self):
        self.paper['authors'][0]['aff']='person@example.test'
        r=[x for x in d.build([self.paper],self.seed)['people'] if x['name']=='Example, Alex'][0]
        self.assertEqual(r['affiliation_as_published'],'Unknown affiliation (contact detail omitted)')
    def test_csv_formula_guard(self):
        for x in ['=1+1','+cmd','-cmd','@user','  =x']:self.assertTrue(d.csv_cell(x).startswith("'"))
    def test_no_membership_or_attendance_inference(self):
        out=d.build([self.paper],self.seed)
        for record in out['people']+out['organizations']:
            self.assertFalse(record['hilo_member']);self.assertFalse(record['attendance_verified']);self.assertFalse(record['outreach_authorized'])
    def test_primary_and_secondary_distinct(self):
        orgs=d.build([self.paper],self.seed)['organizations']
        self.assertTrue(next(o for o in orgs if o['name']=='Dexmate')['primary_evidence_present'])
        self.assertFalse(next(o for o in orgs if o['name']=='Robotera')['primary_evidence_present'])
    def test_booth_not_inferred_for_sponsor(self):
        orgs=d.build([self.paper],self.seed)['organizations'];self.assertEqual(next(o for o in orgs if o['name']=='Arm')['booths'],[])
    def test_roles_merge_without_duplicate_organizations(self):
        orgs=d.build([self.paper],self.seed)['organizations'];self.assertEqual(len([o for o in orgs if o['name']=='Symbotic']),1)
    def test_untrusted_markup_rejected(self):
        with self.assertRaises(ValueError):d.scalar('<script>x</script>')
    def test_stable_identifiers(self):
        self.assertEqual(d.ident('person',['a','b']),d.ident('person',['a','b']))
        self.assertNotEqual(d.ident('person',['a','bc']),d.ident('person',['ab','c']))
    def test_name_format_only_exact_normalization(self):
        self.assertEqual(d.name_key('Example, Alex'),d.name_key('Alex Example'))
        self.assertNotEqual(d.name_key('A. Example'),d.name_key('Alex Example'))
    def test_retention_scoring_unchanged(self):
        out=d.build([self.paper],self.seed);self.assertIsNone(out['coverage']['unique_human_count']);self.assertEqual(out['coverage']['real_robot_hours'],0)
    def test_output_no_contact_fields(self):
        for p in d.build([self.paper],self.seed)['people']:self.assertFalse({'email','phone','address','private_note'} & p.keys())
    def test_export_and_self_contained_viewer(self):
        out=d.build([self.paper],self.seed)
        with tempfile.TemporaryDirectory() as tmp:
            dest=Path(tmp);d.save(out,dest,dest/'index.html');self.assertTrue((dest/'people.csv').is_file());view=(dest/'index.html').read_text()
            self.assertNotIn('__DIRECTORY_JSON__',view);self.assertNotIn('innerHTML',view);self.assertIn('noindex,nofollow',view);self.assertTrue((dest/'checksums.json').is_file())
    def test_coverage_always_partial(self):
        c=d.build([self.paper],self.seed)['coverage'];self.assertFalse(c['official_exhibitor_coverage_complete']);self.assertEqual(c['coverage'],'partial')
    def test_rerun_is_deterministic(self):self.assertEqual(d.build([self.paper],self.seed),d.build([self.paper],self.seed))
    def test_blocked_source_cannot_back_record(self):
        self.seed['people_assertions'][0]['source_id']='floorplan'
        with self.assertRaises(ValueError):d.build([self.paper],self.seed)
    def test_source_link_must_be_public_https(self):
        self.seed['sources'][0]['url']='javascript:alert(1)'
        with self.assertRaises(ValueError):d.build([self.paper],self.seed)

if __name__=='__main__':unittest.main()
