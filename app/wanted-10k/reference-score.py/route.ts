const source = `"""Dependency-free WANTED-10K scoring reference, protocol 0.2 + A2/R1."""
from __future__ import annotations

from dataclasses import dataclass
HORIZON = 10_000.0
MASK_64 = (1 << 64) - 1
ALLOWED_DISPOSITIONS = {
    "completed",
    "unrelated_censor",
    "rejected",
    "safety_termination",
    "developer_withdrawal",
    "consent_privacy_withdrawal",
}
TERMINAL_COMPETING_CAUSES = {
    "safety_termination",
    "developer_withdrawal",
    "consent_privacy_withdrawal",
}

class PCG32:
    """Exact 0.2-A2 PCG XSH RR 64/32 stream and high-word index map."""
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
    disposition: str
    identifier: str = ""

    @property
    def rejected(self) -> bool:
        return self.disposition == "rejected"

def validate_rows(rows: list[Environment], horizon: float = HORIZON) -> None:
    """Validate the complete A2 endpoint taxonomy before any statistic is reported."""
    if not rows:
        raise ValueError("at least one independent environment is required")
    for index, row in enumerate(rows, start=1):
        if row.hours < 0 or row.hours > horizon:
            raise ValueError(f"row {index}: hours must be inside the evaluation horizon")
        if row.disposition not in ALLOWED_DISPOSITIONS:
            raise ValueError(f"row {index}: unknown disposition")
        if row.disposition == "completed" and row.hours != horizon:
            raise ValueError(f"row {index}: completion requires exactly 10,000 hours")
        if row.disposition == "unrelated_censor" and row.hours == horizon:
            raise ValueError(f"row {index}: unrelated censoring at 10,000 hours is invalid")
        if row.disposition in TERMINAL_COMPETING_CAUSES:
            raise ValueError(f"row {index}: terminal competing cause is not rankable")

def wanted_summary(rows: list[Environment], horizon: float = HORIZON) -> dict[str, float | int]:
    """A2 normalized RMST, post-event S(tau), and exact horizon accounting."""
    validate_rows(rows, horizon)

    event_times = sorted({r.hours for r in rows if r.rejected})
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
    risk_set = sum(r.hours >= horizon for r in rows)
    horizon_rejections = sum(r.rejected and r.hours == horizon for r in rows)
    retained = sum(r.disposition == "completed" and r.hours == horizon for r in rows)
    if risk_set != horizon_rejections + retained:
        raise ValueError("10,000-hour risk set does not reconcile")
    return {
        "wanted_score": 100.0 * area / horizon,
        "survival_at_10000": survival,
        "support_at_10000": risk_set,
        "horizon_rejections": horizon_rejections,
        "retained_at_10000": retained,
    }

def wanted_score(rows: list[Environment], horizon: float = HORIZON) -> float:
    """Normalized RMST using Kaplan-Meier, without unsupported extrapolation."""
    return float(wanted_summary(rows, horizon)["wanted_score"])

def confidence_interval(
    rows: list[Environment], samples: int = 10_000, seed: int = 10_000
) -> tuple[float, float]:
    """Environment-level nonparametric bootstrap, percentile 95% interval."""
    summary = confidence_summary(rows, samples, seed)
    return float(summary["ci95_lower"]), float(summary["ci95_upper"])

def confidence_summary(
    rows: list[Environment], samples: int = 10_000, seed: int = 10_000
) -> dict[str, float | int | str]:
    """Deterministic A2 interval plus the required valid-resample fraction."""
    validate_rows(rows)
    if len(rows) < 2:
        raise ValueError("at least two environments are required")
    if samples < 1:
        raise ValueError("samples must be positive")
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

    return {
        "ci95_lower": percentile(0.025),
        "ci95_upper": percentile(0.975),
        "bootstrap_valid_fraction": len(estimates) / samples,
        "bootstrap_samples": samples,
        "bootstrap_seed": seed,
        "bootstrap_prng": "pcg32_xsh_rr_64_32_seeded_v1",
    }

def robustness_profile(
    rows: list[Environment], horizon: float = HORIZON
) -> dict[str, object]:
    """Required stress disclosures; these bounds never replace primary W."""
    observed = wanted_score(rows, horizon)
    lower_rows = [
        Environment(
            r.hours,
            "rejected" if r.disposition == "unrelated_censor" else r.disposition,
            r.identifier,
        )
        for r in rows
    ]
    upper_rows = [
        r if r.rejected else Environment(horizon, "completed", r.identifier)
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
            "horizon_rejections": sum(r.rejected and r.hours == horizon for r in rows),
            "retained_at_10000": sum(r.disposition == "completed" and r.hours == horizon for r in rows),
            "unrelated_early_censors": sum(r.disposition == "unrelated_censor" and r.hours < horizon for r in rows),
            "voluntary_rejections": sum(r.rejected for r in rows),
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
