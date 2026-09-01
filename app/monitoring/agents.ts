export type MonitorAgent = {
  id: string;
  name: string;
  cadence: string;
  mode: "live" | "scheduled" | "guardrail";
  description: string;
};

export const monitorAgents: readonly MonitorAgent[] = [
  { id: "01", name: "Availability Sentinel", cadence: "Every 30 min", mode: "live", description: "Status, redirects, latency, and content signatures across critical human and machine routes." },
  { id: "02", name: "Route Integrity", cadence: "Hourly", mode: "live", description: "First-party navigation, documentation links, static assets, canonicals, and JSON validity." },
  { id: "03", name: "Deployment Drift", cadence: "Hourly", mode: "scheduled", description: "Live behavior versus the digitalocean branch and latest versioned deployment release." },
  { id: "04", name: "MCP Contract Sentinel", cadence: "Hourly", mode: "live", description: "Discovery, tool schemas, deterministic order, protocol headers, and read-only annotations." },
  { id: "05", name: "Performance Observer", cadence: "Every 2 hours", mode: "live", description: "Low-volume latency, response size, timeout, and cache-policy regression checks." },
  { id: "06", name: "HILO Safety Auditor", cadence: "Every 4 hours", mode: "guardrail", description: "Safety-kernel separation, human authority, and the absence of public actuation tools." },
  { id: "07", name: "Benchmark Data Steward", cadence: "Every 6 hours", mode: "scheduled", description: "Cross-surface consistency for HILO, MTHI, Human Burden, Jetson, scores, and evidence caveats." },
  { id: "08", name: "Accessibility & Discovery", cadence: "Every 12 hours", mode: "scheduled", description: "Metadata, headings, landmarks, labels, keyboard access, agent manifests, and mobile behavior." },
  { id: "09", name: "Security & Privacy Watch", cadence: "Every 6 hours", mode: "guardrail", description: "Passive TLS, headers, CORS, error leakage, analytics claims, and unexpected data exposure." },
  { id: "10", name: "Ecosystem Evolution", cadence: "Daily · 09:00 PT", mode: "scheduled", description: "Authoritative changes in MCP, Realtime, robot models, Jetson, and embodied benchmarks." },
] as const;

export const monitoredPaths = ["/", "/scan", "/leaderboard", "/wanted-10k", "/wanted-10k/realtime", "/agents", "/agent.json", "/llms.txt", "/mcp"] as const;

export function monitoringPathsForDate(date = new Date()) {
  const dailyPath = dailyExperienceForDate(date).path;
  return [dailyPath, ...monitoredPaths.filter((path) => path !== dailyPath)] as const;
}
import { dailyExperienceForDate } from "../daily-rotation.ts";
