export const MCP_PROTOCOL_VERSION = "2026-07-28";
export const MCP_SUPPORTED_VERSIONS = [MCP_PROTOCOL_VERSION, "2025-11-25", "2025-03-26"] as const;

type JsonRpcId = string | number | null;
type JsonObject = Record<string, unknown>;

type JsonRpcRequest = {
  jsonrpc?: unknown;
  id?: JsonRpcId;
  method?: unknown;
  params?: unknown;
};

const robotModels = [
  { name: "GR00T N1.6", organization: "NVIDIA", category: "humanoid VLA", tasks: ["humanoid loco-manipulation"], evidence: "real", open: true, illustrativeIndex: 75.9 },
  { name: "Helix 02", organization: "Figure AI", category: "humanoid policy", tasks: ["humanoid manipulation"], evidence: "real", open: false, illustrativeIndex: 69.8 },
  { name: "OpenVLA-OFT", organization: "Stanford / TRI", category: "open VLA", tasks: ["manipulation"], evidence: "real", open: true, illustrativeIndex: 72.6 },
  { name: "RoboBrain 2.0", organization: "BAAI", category: "embodied VLM", tasks: ["embodied reasoning"], evidence: "simulation", open: true, illustrativeIndex: 67.2 },
  { name: "SmolVLA", organization: "Hugging Face", category: "compact VLA", tasks: ["local manipulation"], evidence: "real", open: true, illustrativeIndex: 58.7 },
  { name: "π0.5", organization: "Physical Intelligence", category: "generalist VLA", tasks: ["mobile manipulation"], evidence: "real", open: true, illustrativeIndex: 78.4 },
] as const;

const edgePlatforms = [
  { name: "Jetson AGX Orin", vendor: "NVIDIA", compute: "up to 275 TOPS", memory: "32 or 64 GB", power: "configurable", fit: "multi-sensor autonomous machines" },
  { name: "Jetson AGX Thor", vendor: "NVIDIA", compute: "up to 2,070 FP4 TFLOPS", memory: "up to 128 GB", power: "40–130 W", fit: "humanoids and physical AI" },
  { name: "Jetson Orin Nano", vendor: "NVIDIA", compute: "up to 67 TOPS", memory: "4 or 8 GB", power: "7–25 W", fit: "entry edge AI and prototypes" },
  { name: "Jetson Orin NX", vendor: "NVIDIA", compute: "up to 157 TOPS", memory: "8 or 16 GB", power: "compact power envelope", fit: "mobile robots and manipulators" },
] as const;

const hiloProtocol = {
  id: "hilo-realtime-v0.1",
  name: "HILO Realtime Protocol",
  status: "public-beta reference protocol",
  benchmarkIsVendorNeutral: true,
  referenceImplementation: "GPT-Realtime-2.1",
  referenceImplementationIsBenchmark: false,
  loop: ["human", "realtime intelligence", "safety kernel", "robot", "physical world", "telemetry", "human"],
  primaryMeasures: {
    humanBurden: "Total operator attention, instructions, corrections, confirmations, and recovery labor per useful robot hour.",
    MTHI: "Mean Time to Human Intervention: autonomous operating time divided by qualifying human interventions.",
  },
  eventFamilies: ["audio", "image", "intent", "tool proposal", "safety decision", "robot command", "result", "intervention", "recovery"],
  imagePipeline: ["camera", "local redaction", "frame selector", "timestamped image event", "model", "action proposal"],
  safetyBoundary: "The agent proposes actions. A separate deterministic safety kernel authorizes, modifies, or blocks robot commands.",
  longHorizonTiers: [
    { tier: "T0", residentHours: 10, label: "integration" },
    { tier: "T1", residentHours: 100, label: "pilot" },
    { tier: "T2", residentHours: 1000, label: "field" },
    { tier: "T3", residentHours: 10000, label: "endurance" },
  ],
} as const;

const siteMap = {
  human: [
    { path: "/agents", purpose: "Agent and MCP integration guide" },
    { path: "/leaderboard", purpose: "Robot models, edge hardware, and evidence explorer" },
    { path: "/wanted-10k", purpose: "Long-horizon WANTED-10K benchmark" },
    { path: "/wanted-10k/realtime", purpose: "HILO Realtime Protocol" },
  ],
  machine: [
    { path: "/mcp", purpose: "MCP Streamable HTTP endpoint; POST only" },
    { path: "/agent.json", purpose: "Agent discovery manifest" },
    { path: "/llms.txt", purpose: "Concise model-readable site guide" },
    { path: "/wanted-10k/openapi.json", purpose: "WANTED-10K OpenAPI document" },
    { path: "/wanted-10k/spec.json", purpose: "WANTED-10K protocol specification" },
  ],
} as const;

const readOnlyAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
} as const;

export const mcpTools = [
  {
    name: "compare_systems",
    title: "Compare robot systems",
    description: "Compare named robot models or edge platforms without conflating model, compute, runtime, and embodiment. Seed scores are illustrative and are never deployment certifications.",
    inputSchema: {
      type: "object",
      properties: {
        names: { type: "array", items: { type: "string", minLength: 1 }, minItems: 2, maxItems: 4, description: "Two to four exact model or platform names." },
      },
      required: ["names"],
      additionalProperties: false,
    },
    outputSchema: {
      type: "object",
      properties: {
        systems: { type: "array", items: { type: "object" } },
        missing: { type: "array", items: { type: "string" } },
        caveat: { type: "string" },
      },
      required: ["systems", "missing", "caveat"],
      additionalProperties: false,
    },
    annotations: readOnlyAnnotations,
  },
  {
    name: "get_hilo_protocol",
    title: "Get the HILO Realtime Protocol",
    description: "Return the vendor-neutral HILO closed loop, Human Burden and MTHI measures, event families, image-event pipeline, safety boundary, and long-horizon tiers.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    outputSchema: { type: "object", additionalProperties: true },
    annotations: readOnlyAnnotations,
  },
  {
    name: "get_site_map",
    title: "Get agent-ready site routes",
    description: "Return stable human and machine-readable Embodied Arena routes so an agent can select the narrowest authoritative source.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    outputSchema: {
      type: "object",
      properties: { human: { type: "array", items: { type: "object" } }, machine: { type: "array", items: { type: "object" } } },
      required: ["human", "machine"],
      additionalProperties: false,
    },
    annotations: readOnlyAnnotations,
  },
  {
    name: "list_edge_platforms",
    title: "List robot edge platforms",
    description: "List edge-compute platforms separately from robot models, emphasizing Jetson compute, memory, power, and deployment fit.",
    inputSchema: {
      type: "object",
      properties: { vendor: { type: "string", description: "Optional case-insensitive vendor filter." } },
      additionalProperties: false,
    },
    outputSchema: {
      type: "object",
      properties: { platforms: { type: "array", items: { type: "object" } }, count: { type: "integer" }, classification: { type: "string" } },
      required: ["platforms", "count", "classification"],
      additionalProperties: false,
    },
    annotations: readOnlyAnnotations,
  },
  {
    name: "list_robot_models",
    title: "List robot intelligence models",
    description: "List the public-beta robot model seed set, optionally filtered by task text or open availability. Illustrative indices are not comparable deployment claims.",
    inputSchema: {
      type: "object",
      properties: {
        task: { type: "string", description: "Optional case-insensitive task text." },
        openOnly: { type: "boolean", description: "When true, return only entries marked open." },
      },
      additionalProperties: false,
    },
    outputSchema: {
      type: "object",
      properties: { models: { type: "array", items: { type: "object" } }, count: { type: "integer" }, caveat: { type: "string" } },
      required: ["models", "count", "caveat"],
      additionalProperties: false,
    },
    annotations: readOnlyAnnotations,
  },
] as const;

const toolNames = new Set(mcpTools.map((tool) => tool.name));

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function rpcError(id: JsonRpcId | undefined, code: number, message: string, data?: JsonObject) {
  return { jsonrpc: "2.0", id: id ?? null, error: { code, message, ...(data ? { data } : {}) } };
}

function toolResult(data: JsonObject, isError = false) {
  return {
    resultType: "complete",
    content: [{ type: "text", text: JSON.stringify(data) }],
    structuredContent: data,
    ...(isError ? { isError: true } : {}),
  };
}

function callTool(name: string, args: JsonObject): ReturnType<typeof toolResult> {
  if (name === "compare_systems") {
    const names = args.names;
    if (!Array.isArray(names) || names.length < 2 || names.length > 4 || names.some((item) => typeof item !== "string" || !item.trim())) {
      return toolResult({ error: "names must contain two to four non-empty exact names" }, true);
    }
    const requested = names.map((item) => String(item));
    const systems = requested.flatMap((requestedName) => {
      const model = robotModels.find((item) => item.name.toLowerCase() === requestedName.toLowerCase());
      if (model) return [{ layer: "model", ...model }];
      const platform = edgePlatforms.find((item) => item.name.toLowerCase() === requestedName.toLowerCase());
      return platform ? [{ layer: "edge-compute platform", ...platform }] : [];
    });
    const found = new Set(systems.map((item) => item.name.toLowerCase()));
    return toolResult({ systems, missing: requested.filter((nameItem) => !found.has(nameItem.toLowerCase())), caveat: "Compare like-for-like evidence. Model, runtime, hardware, embodiment, task distribution, and intervention policy remain separate layers." });
  }

  if (name === "get_hilo_protocol") return toolResult({ protocol: hiloProtocol });
  if (name === "get_site_map") return toolResult({ ...siteMap });

  if (name === "list_edge_platforms") {
    if (args.vendor !== undefined && typeof args.vendor !== "string") return toolResult({ error: "vendor must be a string" }, true);
    const vendor = typeof args.vendor === "string" ? args.vendor.trim().toLowerCase() : "";
    const platforms = edgePlatforms.filter((item) => !vendor || item.vendor.toLowerCase().includes(vendor));
    return toolResult({ platforms, count: platforms.length, classification: "These are edge-compute platforms, not robot models." });
  }

  if (name === "list_robot_models") {
    if (args.task !== undefined && typeof args.task !== "string") return toolResult({ error: "task must be a string" }, true);
    if (args.openOnly !== undefined && typeof args.openOnly !== "boolean") return toolResult({ error: "openOnly must be a boolean" }, true);
    const task = typeof args.task === "string" ? args.task.trim().toLowerCase() : "";
    const models = robotModels.filter((item) => (!args.openOnly || item.open) && (!task || item.tasks.some((modelTask) => modelTask.toLowerCase().includes(task))));
    return toolResult({ models, count: models.length, caveat: "Public-beta seed data and illustrative indices are not deployment certifications." });
  }

  return toolResult({ error: `Unknown tool: ${name}` }, true);
}

function requestMeta(params: unknown): JsonObject {
  if (!isObject(params) || !isObject(params._meta)) return {};
  return params._meta;
}

function validateOrigin(request: Request): string | null {
  const origin = request.headers.get("origin");
  if (!origin) return null;
  const requestOrigin = new URL(request.url).origin;
  const configured = (process.env.MCP_ALLOWED_ORIGINS || "").split(",").map((value) => value.trim()).filter(Boolean);
  return origin === requestOrigin || configured.includes(origin) ? null : `Origin ${origin} is not allowed`;
}

function decodeMcpHeader(value: string): string | null {
  if (!value.startsWith("=?base64?") || !value.endsWith("?=")) return value;
  try {
    return atob(value.slice(9, -2));
  } catch {
    return null;
  }
}

function validateModernHeaders(request: Request, body: JsonRpcRequest): string | null {
  const params = isObject(body.params) ? body.params : {};
  const meta = requestMeta(params);
  const headerVersion = request.headers.get("mcp-protocol-version");
  const metaVersion = meta["io.modelcontextprotocol/protocolVersion"];
  if (headerVersion !== MCP_PROTOCOL_VERSION || metaVersion !== MCP_PROTOCOL_VERSION) return "MCP-Protocol-Version must match params._meta protocolVersion";
  const methodHeader = request.headers.get("mcp-method");
  if (methodHeader !== body.method) return "Mcp-Method header must match the JSON-RPC method";
  if (body.method === "tools/call") {
    const bodyName = typeof params.name === "string" ? params.name : "";
    const encodedName = request.headers.get("mcp-name");
    if (!encodedName || decodeMcpHeader(encodedName) !== bodyName) return "Mcp-Name header must match params.name";
  }
  return null;
}

export async function handleMcpRequest(request: Request): Promise<Response> {
  if (request.method !== "POST") return new Response(null, { status: 405, headers: { Allow: "POST" } });

  const originError = validateOrigin(request);
  if (originError) return Response.json(rpcError(null, -32000, originError), { status: 403 });

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 65_536) return Response.json(rpcError(null, -32600, "Request body exceeds 64 KiB"), { status: 413 });
  if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) return Response.json(rpcError(null, -32600, "Content-Type must be application/json"), { status: 415 });

  let body: JsonRpcRequest;
  try {
    const text = await request.text();
    if (text.length > 65_536) return Response.json(rpcError(null, -32600, "Request body exceeds 64 KiB"), { status: 413 });
    body = JSON.parse(text) as JsonRpcRequest;
  } catch {
    return Response.json(rpcError(null, -32700, "Parse error"), { status: 400 });
  }

  if (!isObject(body) || body.jsonrpc !== "2.0" || typeof body.method !== "string") return Response.json(rpcError(body?.id, -32600, "Invalid JSON-RPC request"), { status: 400 });

  const params = isObject(body.params) ? body.params : {};
  const meta = requestMeta(params);
  const headerVersion = request.headers.get("mcp-protocol-version");
  const metaVersion = meta["io.modelcontextprotocol/protocolVersion"];
  const modern = headerVersion === MCP_PROTOCOL_VERSION || metaVersion === MCP_PROTOCOL_VERSION || body.method === "server/discover";

  if (modern) {
    const headerError = validateModernHeaders(request, body);
    if (headerError) return Response.json(rpcError(body.id, -32020, `Header mismatch: ${headerError}`), { status: 400 });
  } else if (headerVersion && !MCP_SUPPORTED_VERSIONS.includes(headerVersion as (typeof MCP_SUPPORTED_VERSIONS)[number])) {
    return Response.json(rpcError(body.id, -32019, "Unsupported protocol version", { supported: [...MCP_SUPPORTED_VERSIONS] }), { status: 400 });
  }

  if (body.id === undefined) return new Response(null, { status: 202 });

  let result: JsonObject;
  if (body.method === "server/discover") {
    result = {
      resultType: "complete",
      supportedVersions: [...MCP_SUPPORTED_VERSIONS],
      capabilities: { tools: {} },
      _meta: { "io.modelcontextprotocol/serverInfo": { name: "Embodied Arena HILO", version: "0.1.0" } },
      instructions: "Use these read-only tools to inspect HILO protocols, robot model seed data, edge-compute platforms, and authoritative site routes. Never interpret illustrative scores as deployment certification. Robot actuation is outside this server and remains behind a separate safety kernel.",
      ttlMs: 3_600_000,
      cacheScope: "public",
    };
  } else if (body.method === "initialize") {
    const requestedVersion = typeof params.protocolVersion === "string" && MCP_SUPPORTED_VERSIONS.includes(params.protocolVersion as (typeof MCP_SUPPORTED_VERSIONS)[number]) ? params.protocolVersion : "2025-11-25";
    result = { protocolVersion: requestedVersion, capabilities: { tools: { listChanged: false } }, serverInfo: { name: "Embodied Arena HILO", version: "0.1.0" }, instructions: "Read-only benchmark and platform discovery. Physical actions are not exposed." };
  } else if (body.method === "tools/list") {
    result = { resultType: "complete", tools: mcpTools, ttlMs: 900_000, cacheScope: "public" };
  } else if (body.method === "tools/call") {
    const name = typeof params.name === "string" ? params.name : "";
    const args = isObject(params.arguments) ? params.arguments : {};
    if (!toolNames.has(name as (typeof mcpTools)[number]["name"])) return Response.json(rpcError(body.id, -32602, `Unknown tool: ${name}`), { status: 400 });
    result = callTool(name, args);
  } else {
    return Response.json(rpcError(body.id, -32601, `Method not found: ${body.method}`), { status: 404 });
  }

  return Response.json({ jsonrpc: "2.0", id: body.id, result }, {
    headers: {
      "MCP-Protocol-Version": modern ? MCP_PROTOCOL_VERSION : String(result.protocolVersion || headerVersion || "2025-03-26"),
      "Cache-Control": body.method === "tools/list" || body.method === "server/discover" ? "public, max-age=300" : "no-store",
      Vary: "Origin, MCP-Protocol-Version, Mcp-Method, Mcp-Name",
    },
  });
}
