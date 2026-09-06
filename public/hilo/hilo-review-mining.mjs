/** HILO 0.1-RM1. Local reference utilities; NOT a field auditor or robot controller. */
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { pathToFileURL } from 'node:url';

export const VERSION = '0.1-RM1';
const REVIEW_KINDS = new Set(['owner_report', 'owner_comment', 'mixed_owner_discussion', 'prospective_question', 'independent_test_report']);
const ORIGINS = new Set(['field', 'human_demo', 'simulation', 'synthetic']);
const BURDEN = new Set(['preparation', 'rescue', 'maintenance', 'diagnosis', 'configuration', 'support', 'supervision']);
const ID = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/;
const HASH = /^[a-f0-9]{64}$/;

function requireThat(condition, message) {
  if (!condition) throw new TypeError(message);
}
function object(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function exactKeys(row, required, optional = []) {
  requireThat(object(row), 'Record must be an object');
  for (const key of required) requireThat(Object.hasOwn(row, key), `Missing ${key}`);
  const allowed = new Set([...required, ...optional]);
  for (const key of Object.keys(row)) requireThat(allowed.has(key), `Unexpected ${key}`);
}
function text(value, name, max = 2000) {
  requireThat(typeof value === 'string' && value.trim().length > 0 && value.length <= max, `Invalid ${name}`);
}
function id(value, name) {
  requireThat(typeof value === 'string' && ID.test(value), `Invalid ${name}`);
}
function nonnegative(value, name) {
  requireThat(Number.isFinite(value) && value >= 0, `Invalid ${name}`);
}
function positive(value, name) {
  requireThat(Number.isFinite(value) && value > 0, `Invalid ${name}`);
}
function integer(value, name) {
  requireThat(Number.isSafeInteger(value) && value >= 0, `Invalid ${name}`);
}
export function timestamp(value) {
  requireThat(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value), 'Timestamp must be explicit UTC ISO-8601');
  const ms = Date.parse(value);
  requireThat(Number.isFinite(ms), 'Invalid timestamp');
  // Date.parse normalizes impossible dates; reject those instead of accepting them.
  const normalized = new Date(ms).toISOString();
  const expected = value.replace(/(?:\.(\d{1,3}))?Z$/, (_, digits) => `.${(digits || '').padEnd(3, '0')}Z`);
  requireThat(normalized === expected, 'Nonexistent calendar timestamp');
  return ms;
}
export function canonicalSourceURL(value) {
  text(value, 'source_url', 4096);
  const url = new URL(value);
  requireThat(url.protocol === 'https:' && !url.username && !url.password && !url.port, 'Source must be public-form HTTPS without credentials or a port');
  url.hash = '';
  if (/(^|\.)reddit\.com$/.test(url.hostname)) {
    const match = url.pathname.match(/\/(?:r\/[^/]+\/)?comments\/([a-z0-9]+)(?:\/[^/]*\/([a-z0-9]+))?/i);
    requireThat(match, 'Use an individual Reddit thread or comment, not a community feed');
    return `https://www.reddit.com/comments/${match[1].toLowerCase()}/${match[2] ? `comment/${match[2].toLowerCase()}/` : ''}`;
  }
  for (const key of [...url.searchParams.keys()]) {
    if (/^(utm_|fbclid$|gclid$)/i.test(key)) url.searchParams.delete(key);
  }
  url.searchParams.sort();
  return url.toString();
}
export function fingerprint(textValue) {
  text(textValue, 'fingerprint_input', 1_000_000);
  return createHash('sha256').update(textValue.normalize('NFKC').replace(/\s+/g, ' ').trim()).digest('hex');
}

/** Strict author-written evidence-note record; raw scraped content is not accepted. */
export function validateReview(row, catalog) {
  exactKeys(row, ['id','source_url','kind','observed_summary','locator','retrieved_at','published_at','mode_ids','evidence_status','rights_status']);
  id(row.id, 'id');
  canonicalSourceURL(row.source_url);
  requireThat(REVIEW_KINDS.has(row.kind), 'Invalid review kind');
  text(row.observed_summary, 'observed_summary');
  text(row.locator, 'locator', 500);
  const retrieved = timestamp(row.retrieved_at);
  if (row.published_at !== null) requireThat(timestamp(row.published_at) <= retrieved, 'Publication is later than retrieval');
  requireThat(row.evidence_status === 'source_read_not_incident_verified', 'Review evidence cannot certify an incident, exposure or fleet rate');
  requireThat(row.rights_status === 'link_and_original_summary_only', 'This importer accepts links and original summaries only');
  requireThat(Array.isArray(row.mode_ids) && row.mode_ids.length > 0 && new Set(row.mode_ids).size === row.mode_ids.length, 'Invalid mode_ids');
  const known = new Set(catalog.modes.map(mode => mode.id));
  for (const mode of row.mode_ids) requireThat(known.has(mode), `Unknown mode ${mode}`);
  return row;
}

/** Metadata only. No video bytes are fetched. Approval assertions require independent audit. */
export function validateClip(row) {
  exactKeys(row, ['id','environment_id','unit_id','session_id','stream_id','origin','start_at','end_at','sha256','license_ref','consent_ref','rights_status','revoked']);
  for (const key of ['id','environment_id','session_id','stream_id']) id(row[key], key);
  requireThat(ORIGINS.has(row.origin), 'Invalid origin');
  if (row.unit_id !== null) id(row.unit_id, 'unit_id');
  requireThat(row.origin !== 'field' || row.unit_id !== null, 'Field robot coverage requires a robot unit');
  const start = timestamp(row.start_at), end = timestamp(row.end_at);
  requireThat(end > start, 'Clip end must follow start');
  requireThat(typeof row.sha256 === 'string' && HASH.test(row.sha256), 'Invalid SHA-256');
  id(row.license_ref, 'license_ref');
  id(row.consent_ref, 'consent_ref');
  requireThat(row.rights_status === 'approved' && row.revoked === false, 'Rights or consent not approved, or revoked');
  return row;
}

/** Merge overlapping ranges: one interval seen by several cameras stays one interval. */
export function unionMilliseconds(ranges) {
  const ordered = ranges.map(range => {
    requireThat(Array.isArray(range) && range.length === 2, 'Expected [start,end]');
    const [start, end] = range;
    requireThat(Number.isFinite(start) && Number.isFinite(end) && end > start, 'Invalid interval');
    return [start, end];
  }).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  let total = 0, start = null, end = null;
  for (const [a, b] of ordered) {
    if (start === null) { start = a; end = b; }
    else if (a <= end) end = Math.max(end, b);
    else { total += end - start; start = a; end = b; }
  }
  return total + (start === null ? 0 : end - start);
}
function addRange(groups, key, range) {
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(range);
}
function groupHours(groups) {
  return [...groups.values()].reduce((sum, ranges) => sum + unionMilliseconds(ranges) / 3_600_000, 0);
}
export function summarizeClips(rows) {
  const assets = new Map(), ids = new Set(), env = new Map(), units = new Map();
  const streams = new Map(), unitLocations = new Map();
  const origins = Object.fromEntries([...ORIGINS].map(origin => [origin, 0]));
  let duplicateAssets = 0;
  for (const row of rows) {
    validateClip(row);
    requireThat(!ids.has(row.id), `Duplicate record id ${row.id}`);
    ids.add(row.id);
    const range = [timestamp(row.start_at), timestamp(row.end_at)];
    const identity = JSON.stringify([row.origin,row.environment_id,row.unit_id,row.session_id,row.stream_id,...range]);
    if (assets.has(row.sha256)) {
      requireThat(assets.get(row.sha256) === identity, 'Identical asset hash has conflicting provenance');
      duplicateAssets += 1; continue;
    }
    assets.set(row.sha256, identity);
    addRange(streams, JSON.stringify([row.origin,row.environment_id,row.unit_id,row.stream_id]), range);
    addRange(env, JSON.stringify([row.origin,row.environment_id]), range);
    if (row.origin === 'field') {
      addRange(units, row.unit_id, range);
      if (!unitLocations.has(row.unit_id)) unitLocations.set(row.unit_id, []);
      unitLocations.get(row.unit_id).push([...range, row.environment_id]);
    }
  }
  // One physical robot cannot occupy different environments at overlapping times.
  for (const locations of unitLocations.values()) {
    locations.sort((a,b) => a[0] - b[0]);
    let until = -Infinity, environment = null;
    for (const [start,end,where] of locations) {
      requireThat(start >= until || where === environment, 'Robot unit has conflicting simultaneous locations');
      if (start >= until) { environment = where; until = end; }
      else until = Math.max(until, end);
    }
  }
  for (const [key,ranges] of streams) origins[JSON.parse(key)[0]] += unionMilliseconds(ranges) / 3_600_000;
  return {
    version: VERSION, unique_assets: assets.size, duplicate_assets: duplicateAssets,
    media_stream_hours_by_origin: origins,
    environment_video_coverage_hours_by_origin: Object.fromEntries([...ORIGINS].map(origin => [origin,groupHours(new Map([...env].filter(([key]) => JSON.parse(key)[0] === origin)))])),
    field_robot_video_coverage_hours: groupHours(units),
    audited_resident_hours: null, audited_active_robot_hours: null,
    interpretation: 'Video coverage is not operating time, autonomous time, co-presence, safety evidence or WANTED certification.'
  };
}

export function rate(count, exposure, scale = 1) {
  integer(count, 'count'); nonnegative(exposure, 'exposure'); positive(scale, 'scale');
  requireThat(exposure > 0 || count === 0, 'Events with zero exposure are inconsistent');
  return exposure === 0 ? null : count / exposure * scale;
}
export function missionSuccess(requiredStages) {
  requireThat(Array.isArray(requiredStages) && requiredStages.length > 0, 'Mission needs required stages');
  for (const stage of requiredStages) requireThat(typeof stage === 'boolean', 'Stage results must be boolean');
  return requiredStages.every(Boolean);
}
export function burdenSummary(intervals, activeHours, completedMissions) {
  nonnegative(activeHours, 'activeHours'); integer(completedMissions, 'completedMissions');
  const byPerson = new Map(), byCategory = new Map();
  for (const row of intervals) {
    exactKeys(row, ['person_id','category','start_at','end_at']);
    id(row.person_id, 'person_id'); requireThat(BURDEN.has(row.category), 'Invalid burden category');
    const range = [timestamp(row.start_at), timestamp(row.end_at)];
    requireThat(range[1] > range[0], 'Invalid burden interval');
    addRange(byPerson, row.person_id, range);
    addRange(byCategory, JSON.stringify([row.person_id,row.category]), range);
  }
  const personMinutes = groupHours(byPerson) * 60;
  const categories = Object.fromEntries([...BURDEN].map(category => [category,groupHours(new Map([...byCategory].filter(([key]) => JSON.parse(key)[1] === category))) * 60]));
  return { person_minutes: personMinutes, minutes_per_active_hour: activeHours > 0 ? personMinutes / activeHours : null,
    minutes_per_completed_mission: completedMissions > 0 ? personMinutes / completedMissions : null,
    category_person_minutes_nonadditive: categories,
    note: 'Overlap is merged per person. Different helpers add person-time. Category totals can overlap; waiting time and dollars remain separate.' };
}
export function zeroFailureUpperRate(hours, confidence = 0.95) {
  positive(hours, 'hours'); requireThat(Number.isFinite(confidence) && confidence > 0 && confidence < 1, 'Invalid confidence');
  return { upper_events_per_hour: -Math.log1p(-confidence) / hours, confidence,
    assumptions: 'Zero observed events; complete ascertainment; preregistered exposure; homogeneous constant-rate Poisson model. Not a wearout or retention estimate.' };
}
export function capacityPlan({ hours, mbps, cameras = 1, copies = 1, sample_fps = 0.1 }) {
  positive(hours, 'hours'); positive(mbps, 'mbps');
  requireThat(Number.isSafeInteger(cameras) && cameras > 0, 'Invalid cameras');
  requireThat(Number.isSafeInteger(copies) && copies > 0, 'Invalid copies'); nonnegative(sample_fps, 'sample_fps');
  return { scenario_hours: hours, total_stream_hours: hours * cameras,
    stored_decimal_TB: hours * 3600 * mbps * 1e6 / 8 * cameras * copies / 1e12,
    sampled_frames: hours * 3600 * sample_fps * cameras,
    boundary: 'Planning estimate only. Excludes logs, indexes, embeddings, metadata, redundancy overhead and reprocessing. No resources allocated.' };
}

export async function validateJsonl(path, kind, catalog) {
  requireThat(['review','clip'].includes(kind), 'Kind must be review or clip');
  const stream = createReadStream(path, { encoding: 'utf8', highWaterMark: 65536 });
  let count = 0, lineNumber = 0, pending = '';
  const consume = line => {
    lineNumber += 1;
    requireThat(Buffer.byteLength(line, 'utf8') <= 262144, `Line ${lineNumber} exceeds 256 KiB`);
    if (!line.trim()) return;
    const row = JSON.parse(line);
    if (kind === 'review') validateReview(row, catalog); else validateClip(row);
    count += 1;
  };
  try {
    for await (const chunk of stream) {
      pending += chunk;
      let next;
      while ((next = pending.indexOf('\n')) !== -1) {
        consume(pending.slice(0, next));
        pending = pending.slice(next + 1);
      }
      requireThat(Buffer.byteLength(pending, 'utf8') <= 262144, `Line ${lineNumber + 1} exceeds 256 KiB`);
    }
    if (pending.length) consume(pending);
    return { valid_records: count, kind, version: VERSION, network_requests: 0, certified_records: 0 };
  } catch (error) {
    throw new Error(`At or after line ${lineNumber}: ${error.message}`, { cause: error });
  } finally { stream.destroy(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { readFile } = await import('node:fs/promises');
  try {
    const [command, kind, path] = process.argv.slice(2);
    if (command === 'validate') {
      requireThat(path, 'Usage: node hilo-review-mining.mjs validate review|clip FILE.jsonl');
      const catalog = JSON.parse(await readFile(new URL('./catalog.json', import.meta.url), 'utf8'));
      console.log(JSON.stringify(await validateJsonl(path, kind, catalog), null, 2));
    } else if (command === 'plan') {
      const hours = Number(kind || 1_000_000);
      console.log(JSON.stringify(capacityPlan({hours, mbps:4}), null, 2));
    } else throw new Error('Usage: validate review|clip FILE.jsonl | plan [SCENARIO_HOURS]');
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
