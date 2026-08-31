const source = `"""Dependency-free WANTED-10K scoring reference, protocol 0.2 + A1/R1."""
from __future__ import annotations

from dataclasses import dataclass
HORIZON = 10_000.0
MASK_64 = (1 << 64) - 1

class PCG32:
    """Exact 0.2-A1 PCG XSH RR 64/32 stream and high-word index map."""
    def __init__(self, seed: int, sequence: int = 54):
        self.state = 0
        self.increment = ((sequence << 1) | 1) & MASK_64
        self.uint32()
        self.state = (self.state + seed) & MASK_64
        self.uint32()

    def uint32(self) -> int:
        previous = self.state
        self.state = (previous * 6364136223846793005 + self.increment) & MASK_64
        shifted = (((previous >> 18) ^ previous) >> 27) & 0xFFFFFFFF
        rotation = (previous >> 59) & 31
        return ((shifted >> rotation) | (shifted << ((-rotation) & 31))) & 0xFFFFFFFF

    def index(self, size: int) -> int:
        return (self.uint32() * size) >> 32

@dataclass(frozen=True)
class Environment:
    hours: float
    rejected: bool
    identifier: str = ""

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
    rng = PCG32(seed)
    n = len(rows)
    estimates: list[float] = []
    for _ in range(samples):
        sample = [rows[rng.index(n)] for _ in range(n)]
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

def robustness_profile(
    rows: list[Environment], horizon: float = HORIZON
) -> dict[str, object]:
    """Required stress disclosures; these bounds never replace primary W."""
    observed = wanted_score(rows, horizon)
    lower_rows = [
        Environment(r.hours, r.rejected or r.hours < horizon, r.identifier)
        for r in rows
    ]
    upper_rows = [
        r if r.rejected else Environment(horizon, False, r.identifier)
        for r in rows
    ]
    lower = wanted_score(lower_rows, horizon)
    upper = wanted_score(upper_rows, horizon)
    influence: list[dict[str, object]] = []
    unsupported = 0
    for index, row in enumerate(rows):
        try:
            estimate = wanted_score(rows[:index] + rows[index + 1 :], horizon)
            influence.append({
                "environment": row.identifier or f"row_{index + 1}",
                "estimate": estimate,
                "shift": estimate - observed,
                "absolute_shift": abs(estimate - observed),
            })
        except ValueError:
            unsupported += 1
    influence.sort(key=lambda item: float(item["absolute_shift"]), reverse=True)
    return {
        "profile_version": "0.2-R1",
        "censoring_bounds": {
            "lower": lower,
            "observed": observed,
            "upper": upper,
            "width": upper - lower,
        },
        "tail_support": {
            "at_risk_9000": sum(r.hours >= 9000 for r in rows),
            "at_risk_10000": sum(r.hours >= horizon for r in rows),
        },
        "leave_one_environment_out": {
            "maximum_absolute_shift": influence[0]["absolute_shift"] if influence else None,
            "most_influential_environment": influence[0]["environment"] if influence else None,
            "unidentifiable_exclusions": unsupported,
            "estimates": influence,
        },
    }
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
