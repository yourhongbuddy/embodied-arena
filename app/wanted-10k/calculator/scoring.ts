export type Outcome = "completed" | "unrelated_censor" | "rejected" | "safety_termination" | "developer_withdrawal" | "consent_privacy_withdrawal";
export type Row = { id: number; environment: string; hours: number; outcome: Outcome };
export const HORIZON = 10_000;

export function score(rows: Row[]) {
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

export function bootstrap(rows: Row[], samples = 1_000) {
  if (rows.length < 2) return { interval: null, validFraction: 0 };
  let state = 10_000;
  const random = () => { state = (1664525 * state + 1013904223) >>> 0; return state / 4294967296; };
  const estimates = Array.from({ length: samples }, () => {
    const sample = Array.from({ length: rows.length }, () => rows[Math.floor(random() * rows.length)]);
    return score(sample).wanted;
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
