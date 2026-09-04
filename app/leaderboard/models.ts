/** Shared illustrative fixtures. These are not measured benchmark results. */
export type Metric = "overall" | "manipulation" | "navigation" | "reasoning";

export const models = [
  { name: "π0.5", org: "Physical Intelligence", overall: 78.4, manipulation: 86.2, navigation: 65.4, reasoning: 82.5, reality: "REAL", open: true, kind: "GENERALIST VLA", task: "Mobile manipulation" },
  { name: "GR00T N1.6", org: "NVIDIA", overall: 75.9, manipulation: 80.4, navigation: 71.5, reasoning: 77.1, reality: "REAL", open: true, kind: "HUMANOID VLA", task: "Humanoid loco-manipulation" },
  { name: "OpenVLA-OFT", org: "Stanford / TRI", overall: 72.6, manipulation: 79.3, navigation: 67.0, reasoning: 74.8, reality: "REAL", open: true, kind: "OPEN VLA", task: "Manipulation" },
  { name: "Helix 02", org: "Figure AI", overall: 69.8, manipulation: 76.6, navigation: 70.2, reasoning: 68.5, reality: "REAL", open: false, kind: "HUMANOID POLICY", task: "Humanoid manipulation" },
  { name: "RoboBrain 2.0", org: "BAAI", overall: 67.2, manipulation: 62.1, navigation: 66.8, reasoning: 81.2, reality: "SIM", open: true, kind: "EMBODIED VLM", task: "Embodied reasoning" },
  { name: "SmolVLA", org: "Hugging Face", overall: 58.7, manipulation: 65.0, navigation: 52.8, reasoning: 63.1, reality: "REAL", open: true, kind: "COMPACT VLA", task: "Local manipulation" },
];

export type RobotModel = (typeof models)[number];

export const metricLabels: Record<Metric, string> = {
  overall: "Overall index",
  manipulation: "Manipulation",
  navigation: "Navigation",
  reasoning: "Embodied reasoning",
};
