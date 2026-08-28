const source = `"""Dependency-free WANTED-10K scoring reference, version 0.2."""
from __future__ import annotations

from dataclasses import dataclass
from random import Random

HORIZON = 10_000.0

@dataclass(frozen=True)
class Environment:
    hours: float
    rejected: bool

def wanted_score(rows: list[Environment], horizon: float = HORIZON) -> float:
    """Normalized RMST using Kaplan-Meier, without unsupported extrapolation."""
    if not rows:
        raise ValueError("at least one independent environment is required")
    if any(r.hours < 0 or r.hours > horizon for r in rows):
        raise ValueError("hours must be inside the evaluation horizon")

    event_times = sorted({r.hours for r in rows if r.rejected and r.hours < horizon})
    survival = 1.0
    area = 0.0
    previous = 0.0

    for time in event_times:
        area += survival * (time - previous)
        at_risk = sum(r.hours >= time for r in rows)
        events = sum(r.rejected and r.hours == time for r in rows)
        survival *= 1.0 - events / at_risk
        previous = time

    last_observed = max(r.hours for r in rows)
    if survival > 0.0 and last_observed < horizon:
        raise ValueError(
            "10,000-hour RMST is not identifiable: follow-up ends before the "
            "horizon while estimated survival remains above zero"
        )

    area += survival * (horizon - previous)
    return 100.0 * area / horizon

def confidence_interval(
    rows: list[Environment], samples: int = 10_000, seed: int = 10_000
) -> tuple[float, float]:
    """Environment-level nonparametric bootstrap, percentile 95% interval."""
    if len(rows) < 2:
        raise ValueError("at least two environments are required")
    rng = Random(seed)
    n = len(rows)
    estimates: list[float] = []
    for _ in range(samples):
        sample = [rows[rng.randrange(n)] for _ in range(n)]
        try:
            estimates.append(wanted_score(sample))
        except ValueError:
            pass

    if len(estimates) / samples < 0.95:
        raise ValueError(
            "fewer than 95% of bootstrap resamples identify the 10,000-hour horizon"
        )
    estimates.sort()

    def percentile(p: float) -> float:
        index = p * (len(estimates) - 1)
        low = int(index)
        high = min(low + 1, len(estimates) - 1)
        return estimates[low] + (estimates[high] - estimates[low]) * (index - low)

    return percentile(0.025), percentile(0.975)
`;

export async function GET() {
  return new Response(source, {
    headers: {
      "content-type": "text/x-python; charset=utf-8",
      "content-disposition": "inline; filename=reference-score.py",
      "cache-control": "public, max-age=3600",
    },
  });
}
