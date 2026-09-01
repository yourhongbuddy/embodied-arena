export type Outcome = "completed" | "unrelated_censor" | "rejected" | "safety_termination" | "developer_withdrawal" | "consent_privacy_withdrawal";
export type Row = { id: number; environment: string; hours: number; outcome: Outcome };
export const HORIZON = 10_000;
export const BOOTSTRAP_PRNG = "pcg32_xsh_rr_64_32_seeded_v1";
const outcomes: Outcome[] = ["completed", "unrelated_censor", "rejected", "safety_termination", "developer_withdrawal", "consent_privacy_withdrawal"];
export const TERMINAL_COMPETING_CAUSES: readonly Outcome[] = ["safety_termination", "developer_withdrawal", "consent_privacy_withdrawal"];

export function validateRows(rows: Row[]) {
  const errors: string[] = [];
  if (!rows.length) errors.push("Provide at least one independent environment.");
  const identifiers = new Set<string>();
  rows.forEach((row, index) => {
    const label = row.environment.trim();
    if (!label) errors.push(`Row ${index + 1}: environment identifier is required.`);
    else if (row.environment !== label) errors.push(`Row ${index + 1}: environment identifier must not have leading or trailing whitespace.`);
    else if (identifiers.has(label)) errors.push(`Row ${index + 1}: duplicate environment identifier ${label}.`);
    identifiers.add(label);
    if (!Number.isFinite(row.hours) || row.hours < 0 || row.hours > HORIZON) errors.push(`Row ${index + 1}: resident hours must be between 0 and ${HORIZON}.`);
    if (!outcomes.includes(row.outcome)) errors.push(`Row ${index + 1}: unrecognized outcome.`);
    if (TERMINAL_COMPETING_CAUSES.includes(row.outcome)) errors.push(`Row ${index + 1}: terminal competing cause ${row.outcome} blocks primary W and ranked analysis.`);
    if (row.outcome === "completed" && row.hours !== HORIZON) errors.push(`Row ${index + 1}: completion requires exactly ${HORIZON} resident hours.`);
    if (row.outcome === "unrelated_censor" && row.hours === HORIZON) errors.push(`Row ${index + 1}: an environment observed through ${HORIZON} hours must be completed unless a rejection or terminal competing cause occurred at the horizon.`);
  });
  return errors;
}

function estimate(rows: Row[]) {
  if (!rows.length) return { wanted: null, survival10k: null, identifiable: false, lastObservableHours: 0, points: [{ time: 0, survival: 1 }] };
  const times = [...new Set(rows.filter(row => row.outcome === "rejected").map(row => row.hours))].sort((a,b)=>a-b);
  let survival = 1;
  let area = 0;
  let previous = 0;
  const points = [{ time: 0, survival: 1 }];
  for (const time of times) {
    area += survival * (time - previous);
    const atRisk = rows.filter(row => row.hours >= time).length;
    const events = rows.filter(row => row.outcome === "rejected" && row.hours === time).length;
    survival *= 1 - events / atRisk;
    points.push({ time, survival });
    previous = time;
  }
  const lastObservableHours = Math.max(...rows.map(row => row.hours));
  const identifiable = survival <= Number.EPSILON || lastObservableHours >= HORIZON;
  if (!identifiable) return { wanted: null, survival10k: null, identifiable, lastObservableHours, points };
  area += survival * (HORIZON - previous);
  return { wanted: 100 * area / HORIZON, survival10k: survival, identifiable, lastObservableHours, points };
}

export function score(rows: Row[]) {
  const errors = validateRows(rows);
  if (errors.length) return { wanted: null, survival10k: null, identifiable: false, lastObservableHours: 0, points: [{ time: 0, survival: 1 }], errors };
  return { ...estimate(rows), errors };
}

function pcg32(seed: number, sequence = 54) {
  const one = BigInt(1);
  const mask = (one << BigInt(64)) - one;
  let state = BigInt(0);
  const increment = ((BigInt(sequence) << one) | one) & mask;
  const next = () => {
    const previous = state;
    state = (previous * BigInt("6364136223846793005") + increment) & mask;
    const shifted = Number((((previous >> BigInt(18)) ^ previous) >> BigInt(27)) & BigInt("4294967295")) >>> 0;
    const rotation = Number(previous >> BigInt(59)) & 31;
    return ((shifted >>> rotation) | (shifted << ((-rotation) & 31))) >>> 0;
  };
  next(); state = (state + (BigInt(seed) & mask)) & mask; next();
  return next;
}

export function bootstrap(rows: Row[], samples = 10_000, seed = 10_000) {
  if (rows.length < 2 || validateRows(rows).length) return { interval: null, validFraction: 0 };
  if (!Number.isInteger(samples) || samples < 1 || !Number.isInteger(seed) || seed < 0) return { interval: null, validFraction: 0 };
  const random = pcg32(seed);
  const estimates = Array.from({ length: samples }, () => {
    const sample = Array.from({ length: rows.length }, () => rows[Number((BigInt(random()) * BigInt(rows.length)) >> BigInt(32))]);
    return estimate(sample).wanted;
  }).filter((estimate): estimate is number => estimate !== null).sort((a,b)=>a-b);
  const validFraction = estimates.length / samples;
  if (validFraction < .95) return { interval: null, validFraction };
  const percentile = (p: number) => {
    const index = p * (estimates.length - 1);
    const low = Math.floor(index), high = Math.min(low + 1, estimates.length - 1);
    return estimates[low] + (estimates[high] - estimates[low]) * (index - low);
  };
  return { interval: [percentile(.025), percentile(.975)] as const, validFraction };
}

export function robustness(rows: Row[]) {
  const errors = validateRows(rows);
  if (errors.length) return { errors, bounds: null, influence: null, support: null };
  const observed = estimate(rows);
  const lowerRows = rows.map(row => row.outcome === "rejected" || row.outcome === "completed" ? row : { ...row, outcome: "rejected" as const });
  const upperRows = rows.map(row => row.outcome === "rejected" ? row : { ...row, hours: HORIZON, outcome: "completed" as const });
  const lower = estimate(lowerRows).wanted;
  const upper = estimate(upperRows).wanted;
  const leaveOneOut = rows.map((row, index) => ({ environment: row.environment, estimate: estimate(rows.filter((_, candidate) => candidate !== index)).wanted }));
  const identifiable = leaveOneOut.filter((item): item is { environment: string; estimate: number } => item.estimate !== null && observed.wanted !== null).map(item => ({ ...item, shift: item.estimate - Number(observed.wanted), absolute_shift: Math.abs(item.estimate - Number(observed.wanted)) })).sort((a, b) => b.absolute_shift - a.absolute_shift);
  const at9000 = rows.filter(row => row.hours >= 9000).length;
  const at10000 = rows.filter(row => row.hours >= HORIZON).length;
  const horizonRejections = rows.filter(row => row.outcome === "rejected" && row.hours === HORIZON).length;
  const retainedAt10000 = rows.filter(row => row.outcome === "completed" && row.hours === HORIZON).length;
  const unrelatedEarly = rows.filter(row => row.outcome === "unrelated_censor" && row.hours < HORIZON).length;
  const terminalEarly = rows.filter(row => TERMINAL_COMPETING_CAUSES.includes(row.outcome) && row.hours < HORIZON).length;
  return {
    errors,
    bounds: { lower, observed: observed.wanted, upper, width: lower === null || upper === null ? null : upper - lower, early_exits: unrelatedEarly + terminalEarly },
    influence: { maximum_absolute_shift: identifiable[0]?.absolute_shift ?? null, most_influential_environment: identifiable[0]?.environment ?? null, unidentifiable_exclusions: leaveOneOut.length - identifiable.length, estimates: identifiable },
    support: { at_risk_9000: at9000, at_risk_10000: at10000, horizon_rejections: horizonRejections, retained_at_10000: retainedAt10000, unrelated_early_censors: unrelatedEarly, terminal_early_exits: terminalEarly, voluntary_rejections: rows.filter(row => row.outcome === "rejected").length },
  };
}
