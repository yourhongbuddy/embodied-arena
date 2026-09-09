export const benchmarkSchema = {
  type: "object", additionalProperties: false, required: ["schemaVersion", "title", "description", "methodology", "evidence", "metrics", "rows", "chart"],
  properties: {
    schemaVersion: { const: 1 }, title: { type: "string", minLength: 1, maxLength: 120 }, description: { type: "string", maxLength: 4000 }, methodology: { type: "string", maxLength: 4000 }, evidence: { enum: ["example", "self-reported"] },
    metrics: { type: "array", minItems: 1, maxItems: 12, items: { type: "object", additionalProperties: false, required: ["id", "name", "unit", "direction"], properties: { id: { type: "string", pattern: "^[a-zA-Z][a-zA-Z0-9_-]{0,39}$" }, name: { type: "string", minLength: 1, maxLength: 80 }, unit: { type: "string", maxLength: 30 }, direction: { enum: ["higher", "lower"] } } } },
    rows: { type: "array", maxItems: 500, items: { type: "object", additionalProperties: false, required: ["id", "label", "values"], properties: { id: { type: "string", pattern: "^[a-zA-Z][a-zA-Z0-9_-]{0,39}$" }, label: { type: "string", minLength: 1, maxLength: 120 }, values: { type: "object", additionalProperties: { type: ["number", "null"], minimum: -1e12, maximum: 1e12 } } } } },
    chart: { type: "object", additionalProperties: false, required: ["type", "metric"], properties: { type: { enum: ["bar", "line", "scatter"] }, metric: { type: "string" }, xMetric: { type: "string", description: "Required for scatter, and must be a different defined metric." } } },
  },
} as const;
