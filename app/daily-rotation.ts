export const DAILY_ROTATION_TIME_ZONE = "America/Los_Angeles";
export const DAILY_ROTATION_START = "2026-08-31";

export const dailyExperiences = [
  { id: "scan", label: "Robot Scan", path: "/scan", description: "Private URDF structure and benchmark-readiness analysis." },
  { id: "wanted-10k", label: "WANTED-10K", path: "/wanted-10k", description: "The long-horizon benchmark for voluntary robot retention." },
  { id: "realtime", label: "HILO Realtime", path: "/wanted-10k/realtime", description: "Human, AI, and robot interaction under a separate safety kernel." },
  { id: "leaderboard", label: "Robot Leaderboard", path: "/leaderboard", description: "Vendor-neutral model, robot, and edge-platform comparisons." },
  { id: "agents", label: "Agent Interface", path: "/agents", description: "Read-only discovery surfaces for agents and MCP clients." },
  { id: "monitoring", label: "10-Agent Monitor", path: "/monitoring", description: "Live route, protocol, safety, and deployment observation." },
  { id: "watch", label: "Watch Library", path: "/watch", description: "Evidence-led robot explainers and technical viewing notes." },
  { id: "atlas", label: "Benchmark Atlas", path: "/atlas", description: "A field guide for choosing meaningful robot evaluations." },
  { id: "campaigns", label: "Campaign Studio", path: "/campaigns", description: "Review-only outreach drafts tied to first-party resources." },
  { id: "analytics", label: "Site Heartbeat", path: "/analytics", description: "Privacy-first first-party activity and route health." },
] as const;

export type DailyExperience = typeof dailyExperiences[number];

function dateKeyInTimeZone(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: DAILY_ROTATION_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function utcDayNumber(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
}

export function dailyRotationIndex(date = new Date()) {
  const elapsed = utcDayNumber(dateKeyInTimeZone(date)) - utcDayNumber(DAILY_ROTATION_START);
  return ((elapsed % dailyExperiences.length) + dailyExperiences.length) % dailyExperiences.length;
}

export function dailyExperienceForDate(date = new Date()): DailyExperience {
  return dailyExperiences[dailyRotationIndex(date)];
}

export function dailyRotationDateKey(date = new Date()) {
  return dateKeyInTimeZone(date);
}
