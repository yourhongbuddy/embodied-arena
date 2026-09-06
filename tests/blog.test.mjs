import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");
const post = JSON.parse(read("public/blog/gpt-6-astra-robot-longevity.json"));

test("blog routes and shared navigation are wired", () => {
  assert.ok(existsSync(new URL("app/blog/page.tsx", root)));
  assert.ok(existsSync(new URL(`app/blog/${post.slug}/page.tsx`, root)));
  assert.match(read("app/components/SiteNav.tsx"), /\["\/blog","Blog"\]/);
  assert.match(read("app/blog/page.tsx"), /post\.slug/);
  assert.match(read(`app/blog/${post.slug}/page.tsx`), /canonical: articlePath/);
});

test("external evidence cannot silently become a HILO certification", () => {
  assert.equal(post.evidence_status, "source_reported");
  assert.deepEqual(post.hilo, {
    verified_resident_hours: null,
    verified_autonomous_hours: null,
    human_interventions: null,
    independent_environments: null,
    wanted_score: null,
    certification: null,
  });
});

test("reported trial counts and estimates are internally consistent", () => {
  assert.equal(post.results.length, 4);
  for (const row of post.results) {
    assert.equal(row.trials, 20);
    assert.ok(Number.isInteger(row.completed) && row.completed >= 0 && row.completed <= row.trials);
    assert.ok(row.minutes_per_run > 0);
    assert.ok(row.estimated_usd_per_run > 0);
  }
  const astra = post.results.filter((row) => row.model === "GPT-6 Astra");
  assert.deepEqual(astra.map((row) => row.completed), [19, 2]);
  assert.equal(post.source.url, "https://openai.robocurve.org/gpt-6-astra/");
  assert.equal(post.source.published_on, "2026-09-04");
  assert.equal(post.limitations.length, 4);
});

test("article preserves the human-retention endpoint and hypothetical calculation boundary", () => {
  const text = post.sections.flatMap((section) => section.paragraphs).join(" ");
  assert.match(text, /permanent voluntary rejection/);
  assert.match(text, /illustration, not an estimate/);
  assert.match(text, /including the failing attempt/);
  assert.match(text, /Charging|charging/);
  assert.ok(Math.abs(Math.pow(0.95, 100) * 100 - 0.5920529220334) < 1e-10);
});
