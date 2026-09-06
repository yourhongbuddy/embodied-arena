import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import * as h from '../public/hilo/hilo-review-mining.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const catalog = JSON.parse(await readFile(join(root,'public/hilo/catalog.json'),'utf8'));
const review = JSON.parse(await readFile(join(root,'public/hilo/example-review.jsonl'),'utf8'));
const fixture = JSON.parse(await readFile(join(root,'public/hilo/example-clip.jsonl'),'utf8'));
const start = '2026-09-04T00:00:00Z';
const clip = (changes = {}) => ({...fixture,id:'a',environment_id:'home-a',unit_id:'robot-a',session_id:'session-a',stream_id:'camera-a',origin:'field',sha256:'a'.repeat(64),...changes});
const task = (changes = {}) => ({person_id:'helper-a',category:'rescue',start_at:start,end_at:'2026-09-04T00:10:00Z',...changes});
const near = (actual, expected) => assert.ok(Math.abs(actual-expected) < 1e-9, `${actual} != ${expected}`);

test('catalog consolidates 72 candidates into 12 families and 16 unexecuted suites', () => {
  assert.equal(catalog.modes.length,72); assert.equal(catalog.families.length,12);
  assert.equal(catalog.suites.length,16); assert.equal(catalog.sources.length,12);
  assert.equal(catalog.references.length,9);
  assert.equal(new Set(catalog.modes.map(m=>m.id)).size,72);
  assert.equal(catalog.modes.filter(m=>m.origin==='new_design_proposal').length,11);
  const families=new Set(catalog.families.map(f=>f.id)), sources=new Set(catalog.sources.map(s=>s.id));
  for(const mode of catalog.modes) {
    assert.ok(families.has(mode.family));
    for(const id of mode.source_ids) assert.ok(sources.has(id));
  }
  for(const suite of catalog.suites) assert.equal(suite.status,'proposed_not_executed');
});
test('sources span seven brands without inventing dates or fleet incidence', () => {
  assert.equal(new Set(catalog.sources.map(s=>s.brand)).size,7);
  for(const s of catalog.sources) {
    assert.equal(s.fleet_rate_eligible,false); assert.equal(s.published_at,null);
    assert.equal(s.verification,'source_read_not_incident_verified');
    assert.equal(s.redistribution,'link_and_original_summary_only');
    assert.doesNotThrow(()=>h.canonicalSourceURL(s.url));
  }
});
test('prospective buyer question is preserved rather than converted to owner failure',()=> {
  assert.equal(catalog.sources.find(s=>s.id==='S10').kind,'prospective_question');
});
test('evidence counters stay zero; third-party references remain undownloaded',()=> {
  assert.equal(catalog.field_robot_hours_collected,0); assert.equal(catalog.video_hours_collected,0);
  assert.equal(catalog.external_datasets_downloaded,false);
  for(const r of catalog.references) assert.equal(r.downloaded,false);
});
test('canonicalization collapses Reddit slugs and tracking, preserves comment identity',()=> {
  assert.equal(h.canonicalSourceURL('https://old.reddit.com/r/test/comments/abc123/title/?utm_source=x'),'https://www.reddit.com/comments/abc123/');
  assert.equal(h.canonicalSourceURL('https://www.reddit.com/r/test/comments/abc123/title/def456/'),'https://www.reddit.com/comments/abc123/comment/def456/');
  assert.equal(h.canonicalSourceURL('https://example.com/a?z=1&utm_source=x&a=2#x'),'https://example.com/a?a=2&z=1');
});
test('source URLs cannot be credentials, non-HTTPS, or community feeds',()=> {
  for(const url of ['http://example.com/a','https://name:secret@example.com/a','https://example.com:8080/a','https://reddit.com/r/test/']) assert.throws(()=>h.canonicalSourceURL(url));
});
test('fingerprints normalize whitespace and Unicode, not independent incident identity',()=> {
  assert.equal(h.fingerprint('a   b\n c'),h.fingerprint('a b c'));
  assert.equal(h.fingerprint('Ａ B'),h.fingerprint('A B'));
  assert.notEqual(h.fingerprint('a b'),h.fingerprint('a c'));
});
test('timestamps require real calendar dates and an explicit UTC time zone',()=> {
  assert.equal(h.timestamp(start),Date.parse(start));
  assert.equal(h.timestamp('2026-09-04T00:00:00.1Z'),Date.parse(start)+100);
  for(const t of ['2026-02-30T00:00:00Z','2026-09-04T00:00:00','2026-09-04','2026-09-04T24:00:00Z']) assert.throws(()=>h.timestamp(t));
});
test('author-written review fixture validates, with unknown publication time',()=> {
  assert.equal(h.validateReview(review,catalog),review);
});
test('review intake rejects invented exposure, certification, or unsupported labels',()=> {
  for(const change of [{robot_hours:10000},{evidence_status:'audited'},{mode_ids:['HILO-999']},{mode_ids:['HILO-001','HILO-001']},{rights_status:'all_rights_granted'}]) assert.throws(()=>h.validateReview({...review,...change},catalog));
});
test('publication cannot follow retrieval and blank evidence is invalid',()=> {
  assert.throws(()=>h.validateReview({...review,published_at:'2026-09-05T00:00:00Z'},catalog));
  assert.throws(()=>h.validateReview({...review,observed_summary:' '},catalog));
});
test('video intake accepts only approved metadata and never grants actual rights',()=> {
  assert.equal(h.validateClip(fixture),fixture);
  for(const change of [{revoked:true},{rights_status:'pending'},{consent_ref:''},{license_ref:''},{sha256:'x'},{unexamined_field:1}]) assert.throws(()=>h.validateClip(clip(change)));
});
test('field clips require unit identity and positive bounded intervals',()=> {
  assert.throws(()=>h.validateClip(clip({unit_id:null})));
  assert.throws(()=>h.validateClip(clip({end_at:start})));
  assert.throws(()=>h.validateClip(clip({end_at:'2026-09-03T00:00:00Z'})));
});
test('interval union merges overlaps and touching boundaries',()=> {
  assert.equal(h.unionMilliseconds([[0,10],[5,20],[20,25],[30,40]]),35);
  assert.equal(h.unionMilliseconds([]),0);
  assert.throws(()=>h.unionMilliseconds([[3,3]]));
});
test('two cameras produce two media-hours but only one robot-coverage hour',()=> {
  const s=h.summarizeClips([clip(),clip({id:'b',stream_id:'camera-b',sha256:'b'.repeat(64)})]);
  assert.equal(s.media_stream_hours_by_origin.field,2);
  assert.equal(s.environment_video_coverage_hours_by_origin.field,1);
  assert.equal(s.field_robot_video_coverage_hours,1);
  assert.equal(s.audited_resident_hours,null); assert.equal(s.audited_active_robot_hours,null);
});
test('identical duplicate assets are counted once and flagged',()=> {
  const s=h.summarizeClips([clip(),clip({id:'b'})]);
  assert.equal(s.unique_assets,1); assert.equal(s.duplicate_assets,1);
  assert.equal(s.media_stream_hours_by_origin.field,1);
});
test('identical assets with conflicting provenance cannot inflate exposure',()=> {
  assert.throws(()=>h.summarizeClips([clip(),clip({id:'b',unit_id:'robot-b'})]),/conflicting provenance/);
});
test('duplicate record identifiers are invalid even with different assets',()=> {
  assert.throws(()=>h.summarizeClips([clip(),clip({sha256:'b'.repeat(64)})]),/Duplicate record/);
});
test('overlapping sessions of a single camera do not add repeated media-hours',()=> {
  const s=h.summarizeClips([clip(),clip({id:'b',session_id:'session-b',sha256:'b'.repeat(64)})]);
  assert.equal(s.media_stream_hours_by_origin.field,1);
  assert.equal(s.field_robot_video_coverage_hours,1);
});
test('one robot cannot be in two environments at the same instant',()=> {
  assert.throws(()=>h.summarizeClips([clip(),clip({id:'b',environment_id:'home-b',sha256:'b'.repeat(64)})]),/simultaneous locations/);
});
test('two robots in one environment have distinct robot coverage, not double resident hours',()=> {
  const s=h.summarizeClips([clip(),clip({id:'b',unit_id:'robot-b',stream_id:'camera-b',sha256:'b'.repeat(64)})]);
  assert.equal(s.field_robot_video_coverage_hours,2);
  assert.equal(s.environment_video_coverage_hours_by_origin.field,1);
  assert.equal(s.audited_resident_hours,null);
});
test('simulation and human demonstrations never become field robot exposure',()=> {
  const s=h.summarizeClips([clip({origin:'simulation'}),clip({id:'b',origin:'human_demo',unit_id:null,sha256:'b'.repeat(64)})]);
  assert.equal(s.field_robot_video_coverage_hours,0);
  assert.equal(s.media_stream_hours_by_origin.simulation,1);
  assert.equal(s.media_stream_hours_by_origin.human_demo,1);
});
test('empty media set returns zero coverage, not known zero audited exposure',()=> {
  const s=h.summarizeClips([]); assert.equal(s.unique_assets,0);
  assert.equal(s.field_robot_video_coverage_hours,0); assert.equal(s.audited_active_robot_hours,null);
});
test('rates are dimensioned by denominator, with missing exposure explicitly null',()=> {
  assert.equal(h.rate(2,100,1000),20); assert.equal(h.rate(0,0),null);
  assert.throws(()=>h.rate(1,0)); assert.throws(()=>h.rate(-1,1)); assert.throws(()=>h.rate(1,Infinity));
});
test('all requested stages must succeed; a partial mission is not success',()=> {
  assert.equal(h.missionSuccess([true,true]),true); assert.equal(h.missionSuccess([true,false]),false);
  assert.throws(()=>h.missionSuccess([])); assert.throws(()=>h.missionSuccess([1]));
});
test('human burden merges same-person overlapping categories',()=> {
  const s=h.burdenSummary([task(),task({category:'diagnosis',start_at:'2026-09-04T00:05:00Z',end_at:'2026-09-04T00:15:00Z'})],2,1);
  near(s.person_minutes,15); near(s.minutes_per_active_hour,7.5);
  near(s.category_person_minutes_nonadditive.rescue,10);
  near(s.category_person_minutes_nonadditive.diagnosis,10);
});
test('different helpers add person-time and zero denominators stay unknown',()=> {
  const s=h.burdenSummary([task(),task({person_id:'helper-b'})],0,0);
  near(s.person_minutes,20); assert.equal(s.minutes_per_active_hour,null);
  assert.equal(s.minutes_per_completed_mission,null);
});
test('malformed burden entries fail closed',()=> {
  assert.throws(()=>h.burdenSummary([task({category:'none'})],1,1));
  assert.throws(()=>h.burdenSummary([task({end_at:start})],1,1));
});
test('zero-event upper bound preserves the constant-rate model assumption',()=> {
  const s=h.zeroFailureUpperRate(1e6);
  near(s.upper_events_per_hour*1e6,2.99573227355399);
  assert.match(s.assumptions,/constant-rate Poisson/);
  assert.throws(()=>h.zeroFailureUpperRate(0)); assert.throws(()=>h.zeroFailureUpperRate(1,1));
});
test('one million hours at four Mbps is 1.8 PB decimal, not GB',()=> {
  const p=h.capacityPlan({hours:1e6,mbps:4}); assert.equal(p.stored_decimal_TB,1800);
  assert.equal(p.sampled_frames,360e6); assert.equal(p.total_stream_hours,1e6);
});
test('camera streams and redundant copies affect storage, not source exposure',()=> {
  const p=h.capacityPlan({hours:1e6,mbps:4,cameras:3,copies:2});
  assert.equal(p.stored_decimal_TB,10800); assert.equal(p.sampled_frames,1080e6);
  assert.equal(p.scenario_hours,1e6); assert.equal(p.total_stream_hours,3e6);
  assert.throws(()=>h.capacityPlan({hours:1e6,mbps:4,cameras:0}));
});
test('streaming intake validates supplied fixtures without network or certification',async()=> {
  for(const kind of ['review','clip']) {
    const s=await h.validateJsonl(join(root,`public/hilo/example-${kind}.jsonl`),kind,catalog);
    assert.equal(s.valid_records,1); assert.equal(s.network_requests,0); assert.equal(s.certified_records,0);
  }
});
test('streaming handles missing files, malformed JSON, and overlong unterminated lines',async()=> {
  const dir=await mkdtemp(join(tmpdir(),'hilo-test-'));
  try {
    await assert.rejects(h.validateJsonl(join(dir,'absent'),'review',catalog));
    const path=join(dir,'bad.jsonl'); await writeFile(path,'{bad}\n');
    await assert.rejects(h.validateJsonl(path,'review',catalog));
    await writeFile(path,'x'.repeat(300000));
    await assert.rejects(h.validateJsonl(path,'review',catalog),/256 KiB/);
  } finally { await rm(dir,{recursive:true,force:true}); }
});
test('streaming accepts CRLF, blank lines, and final line without newline',async()=> {
  const dir=await mkdtemp(join(tmpdir(),'hilo-test-'));
  try {
    const path=join(dir,'ok.jsonl'); await writeFile(path,'\r\n'+JSON.stringify(review)+'\r\n\n'+JSON.stringify({...review,id:'other'}));
    assert.equal((await h.validateJsonl(path,'review',catalog)).valid_records,2);
  } finally { await rm(dir,{recursive:true,force:true}); }
});
test('CLI exposes an explicit planning result and rejects unknown commands',()=> {
  const script=join(root,'public/hilo/hilo-review-mining.mjs');
  const result=spawnSync(process.execPath,[script,'plan','1000000'],{encoding:'utf8'});
  assert.equal(result.status,0); assert.equal(JSON.parse(result.stdout).stored_decimal_TB,1800);
  assert.equal(spawnSync(process.execPath,[script,'crawl-the-internet'],{encoding:'utf8'}).status,1);
});
