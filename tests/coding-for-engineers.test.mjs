import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=(p)=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const data=JSON.parse(read('public/coding-for-engineers/benchmarks.json'));
const page=read('app/coding-for-engineers/page.tsx');
const nav=read('app/components/EngineeringSiteNav.tsx');

test('exactly the three requested benchmarks have unique IDs and primary URLs',()=>{
  assert.deepEqual(data.benchmarks.map(b=>b.id),['programbench','srebench','code-migration']);
  assert.deepEqual(data.benchmarks.map(b=>b.source_url),['https://programbench.com/','https://www.vals.ai/benchmarks/srebench','https://www.vals.ai/benchmarks/code-migration']);
});
test('submitted figures are preserved exactly and never promoted to HILO results',()=>{
  assert.deepEqual(data.benchmarks.map(b=>b.submitted_snapshot.rows.map(r=>r.value)),[[5.5,7,2,0,1.5,1.5,0],[88,55.9,12.5],[67.7,54.6,44.2,20.5,14.2]]);
  for(const b of data.benchmarks){assert.equal(b.submitted_snapshot.origin,'user_supplied');assert.match(b.submitted_snapshot.verification,/not_independently_verified/);assert.equal(b.submitted_snapshot.run_date,null);assert.equal(b.submitted_snapshot.harness,null);}
  assert.equal(data.hilo_runs,0);assert.equal(data.aggregate_score,null);
});
test('unconfirmed publisher scores are absent rather than invented or zero-filled',()=>{
  const b=data.benchmarks.find(b=>b.id==='srebench');assert.deepEqual(b.publisher_observation.rows,[]);assert.equal(b.publisher_observation.status,'method_verified_scores_unconfirmed');
});
test('publisher observations and publication/update/retrieval dates remain separate',()=>{
  assert.equal(data.checked_on,'2026-09-27');
  for(const b of data.benchmarks){assert.equal(b.source_published_on,null);assert.match(b.source_updated_on,/^2026-09-\d{2}$/);assert.equal(b.publisher_observation.checked_on,data.checked_on);assert.notEqual(b.publisher_observation.checked_on,b.source_updated_on);}
});
test('scores have valid ranges and preserve model configuration labels',()=>{
  for(const b of data.benchmarks)for(const set of [b.publisher_observation,b.submitted_snapshot]){
    assert.equal(new Set(set.rows.map(r=>r.model)).size,set.rows.length);
    for(const r of set.rows){assert.ok(Number.isFinite(r.value)&&r.value>=0&&r.value<=100);assert.ok(r.model.length>0);}
  }
  assert.equal(data.benchmarks[0].publisher_observation.rows[1].model,'GPT-5.6 Sol (xhigh)');
});
test('benchmark rules and metrics are not flattened into a single score',()=>{
  assert.equal(new Set(data.benchmarks.map(b=>b.metric_id)).size,3);
  assert.match(data.benchmarks[0].tool_policy,/No original source, internet, decompiler/);
  assert.match(data.benchmarks[1].tool_policy,/includes decompilers/);
  assert.match(data.benchmarks[1].metric_explanation,/all six/);
  assert.match(data.benchmarks[2].metric_explanation,/source repositories equally/);
});
test('primary navigation has one real route link and an accessible current state',()=>{
  assert.equal(nav.split('["/coding-for-engineers","Coding for Engineers"]').length-1,1);
  assert.match(nav,/aria-current/);assert.match(nav,/'|"use client"/);
});
test('the page content is server-rendered with native progressive disclosure',()=>{
  assert.doesNotMatch(page,/use client|useEffect|aria-busy|assignmentReceipt/);
  assert.match(page,/<details/);assert.match(page,/<summary/);assert.match(page,/User-submitted snapshot/);assert.match(page,/not HILO results/);
});
test('metadata and sitemap use the canonical route without removing old paths',()=>{
  assert.match(page,/alternates: \{ canonical:/);assert.match(page,/openGraph:/);assert.match(page,/twitter:/);
  const sitemap=read('public/sitemap.xml');assert.equal(sitemap.split('https://getrobotrouter.com/coding-for-engineers').length-1,1);
  for(const suffix of ['/wanted-10k/protocol','/wanted-10k/sdk','/hilo/developers.html'])assert.ok(sitemap.includes(suffix));
  assert.doesNotMatch(sitemap,/\/account|\/login/);
});
test('the feature adds no upload, inference, executable launch or account request',()=>{
  assert.doesNotMatch(page,/fetch\(|<iframe|<input[^>]+type="file"|<form|\/api\/experiments\/assignment/);
  assert.match(page,/No benchmark runs are executed/);assert.match(page,/download>/);
});
test('both publishers and submitted rows stay visible to non-JavaScript clients',()=>{
  assert.match(page,/publisher_observation\.rows/);assert.match(page,/submitted_snapshot\.rows/);assert.match(page,/type ScoreRow/);
  assert.match(page,/Software evidence ≠ physical robot reliability/);
});
test('hosting release gate is unchanged',()=>{
  assert.match(read('.do/app.yaml'),/deploy_on_push: false/);
});

// Frozen landing measurements must not silently inherit an engineering navigation change.
test('C8 presentation and experiment logic stay frozen while engineering entry points opt in',async()=>{
  const {createHash}=await import('node:crypto');
  assert.equal(createHash('sha256').update(read('app/components/SiteNav.tsx')).digest('hex'),'704284f78d19efb894586e735c9299a1a505aa3ea8f0c6c4f86e6bff8dbeb067');
  const {EXPERIMENT_PRESENTATION_SOURCES}=await import('../app/experiments/presentation-integrity.ts');
  for(const source of EXPERIMENT_PRESENTATION_SOURCES){assert.equal(createHash('sha256').update(read(source.path).replace(/\r\n?/g,'\n')).digest('hex'),source.sha256,source.path);}
  for(const path of ['app/wanted-10k/protocol/page.tsx','app/wanted-10k/sdk/page.tsx','app/scan/page.tsx'])assert.match(read(path),/EngineeringSiteNav as SiteNav/);
  assert.doesNotMatch(read('app/wanted-10k/page.tsx'),/EngineeringSiteNav/);
});
