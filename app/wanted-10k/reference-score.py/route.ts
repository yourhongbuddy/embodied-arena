const source = `"""Dependency-free WANTED-10K scoring reference, version 0.1."""
from __future__ import annotations

from dataclasses import dataclass
from random import Random

HORIZON = 10_000.0

@dataclass(frozen=True)
class Environment:
    hours: float
    rejected: bool

def wanted_score(rows: list[Environment], horizon: float = HORIZON) -> float:
    """Normalized restricted mean survival time using Kaplan-Meier."""
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
    estimates = sorted(
        wanted_score([rows[rng.randrange(n)] for _ in range(n)])
        for _ in range(samples)
    )

    def percentile(p: float) -> float:
        index = p * (samples - 1)
        low = int(index)
        high = min(low + 1, samples - 1)
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
