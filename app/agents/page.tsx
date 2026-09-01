import type { Metadata } from "next";
import { SiteNav } from "../components/SiteNav";

export const metadata: Metadata = {
  title: "Agent & MCP Interface — Embodied Arena",
  description: "Connect AI agents to vendor-neutral HILO benchmark data through a safe, read-only Model Context Protocol interface.",
};

const tools = [
  ["compare_systems", "Compare two to four named robot models or edge platforms while preserving layer boundaries."],
  ["get_hilo_protocol", "Read HILO’s loop, Human Burden, MTHI, event vocabulary, safety split, and time tiers."],
  ["get_site_map", "Choose the narrowest human or machine-readable source for the next agent step."],
  ["list_edge_platforms", "Inspect Jetson-class compute as hardware—not as a robot policy or embodiment."],
  ["list_robot_models", "Filter the public-beta seed set by task and open availability, with caveats attached."],
] as const;

const eventChain = ["human intent", "agent proposal", "safety decision", "robot command", "world result", "evidence event"];

const protocolExample = `POST /mcp
MCP-Protocol-Version: 2026-07-28
Mcp-Method: tools/call
Mcp-Name: get_hilo_protocol

{
  "jsonrpc": "2.0",
  "id": "hilo-1",
  "method": "tools/call",
  "params": {
    "name": "get_hilo_protocol",
    "arguments": {},
    "_meta": {
      "io.modelcontextprotocol/protocolVersion": "2026-07-28",
      "io.modelcontextprotocol/clientInfo": {
        "name": "my-agent",
        "version": "1.0.0"
      },
      "io.modelcontextprotocol/clientCapabilities": {}
    }
  }
}`;

const openAIExample = `const response = await client.responses.create({
  model: "gpt-5",
  tools: [{
    type: "mcp",
    server_label: "embodied_arena",
    server_url: "https://YOUR-DOMAIN/mcp",
    require_approval: "never"
  }],
  input: "Compare GR00T N1.6 with Jetson AGX Thor."
});`;

export default function AgentsPage() {
  return <main className="agentsPage">
    <SiteNav />

    <section className="agentsHero shell">
      <div>
        <span className="kicker">AGENT INTERFACE / MCP 2026-07-28</span>
        <h1>Robots need an<br/><em>agent contract.</em></h1>
        <p>Embodied Arena now exposes HILO knowledge as deterministic, structured, read-only tools. Agents can reason over benchmark evidence without gaining a path around physical safety.</p>
        <div className="agentsActions"><a className="primary" href="/agent.json">Read the manifest <span>↗</span></a><a className="secondary" href="#connect">Connect an agent</a></div>
      </div>
      <aside className="endpointCard">
        <header><span className="liveDot"/>MCP ENDPOINT <b>READ ONLY</b></header>
        <code>POST /mcp</code>
        <dl>
          <div><dt>TRANSPORT</dt><dd>Streamable HTTP</dd></div>
          <div><dt>STATE</dt><dd>Stateless</dd></div>
          <div><dt>TOOLS</dt><dd>5 deterministic</dd></div>
          <div><dt>AUTH</dt><dd>Public research data</dd></div>
        </dl>
        <p>Model-neutral protocol. GPT-Realtime-2.1 is the first HILO reference implementation, never the benchmark itself.</p>
      </aside>
    </section>

    <section className="agentLoopSection">
      <div className="shell">
        <header className="agentSectionHead"><span className="kicker">01 / CLOSED LOOP</span><h2>One trace. Two control planes.</h2><p>The reasoning plane may interpret, compare, and propose. The robot plane alone may authorize and execute.</p></header>
        <div className="agentLoop" role="img" aria-label="Human intent flows to an agent proposal, then a separate safety decision, robot command, world result, and evidence event before returning to the human.">
          {eventChain.map((event, index) => <div key={event} className={index === 2 ? "safetyNode" : ""}><span>{String(index + 1).padStart(2, "0")}</span><b>{event}</b>{index < eventChain.length - 1 && <i>→</i>}</div>)}
        </div>
        <div className="planeNotes"><article><span>REASONING PLANE</span><b>MCP + agent</b><p>Reads protocols and evidence, resolves intent, and produces typed proposals with provenance.</p></article><article><span>CONTROL PLANE</span><b>Independent safety kernel</b><p>Checks limits, state, permissions, stop conditions, and hardware interlocks before dispatch.</p></article></div>
      </div>
    </section>

    <section className="agentToolsSection shell">
      <header className="agentSectionHead"><span className="kicker">02 / TOOL SURFACE</span><h2>Small tools, explicit meaning.</h2><p>Stable names, strict JSON Schema, structured output, read-only annotations, and deterministic ordering reduce ambiguity and improve caching.</p></header>
      <div className="agentToolGrid">{tools.map(([name, description], index) => <article key={name}><span>0{index + 1}</span><code>{name}</code><p>{description}</p><small>READ ONLY · IDEMPOTENT</small></article>)}</div>
    </section>

    <section className="agentContractSection">
      <div className="shell">
        <header className="agentSectionHead light"><span className="kicker">03 / BENCHMARK CONTRACT</span><h2>Agent-native does not mean agent-controlled.</h2><p>Every output carries the limits needed to stop an agent from promoting a convenient number into an unsupported claim.</p></header>
        <div className="contractGrid">
          <article><span>01</span><b>Provenance travels</b><p>Source, evidence type, protocol state, and public-beta caveats stay adjacent to the data.</p></article>
          <article><span>02</span><b>Layers stay separate</b><p>Model, runtime, edge compute, embodiment, and safety envelope are never silently collapsed.</p></article>
          <article><span>03</span><b>Human burden counts</b><p>Agents can retrieve Human Burden and MTHI definitions, not hide operator labor behind task success.</p></article>
          <article><span>04</span><b>Action requires authority</b><p>This public MCP server exposes no mutating or actuation tool. A future action server must be separately authenticated and approved.</p></article>
        </div>
      </div>
    </section>

    <section className="connectSection shell" id="connect">
      <header className="agentSectionHead"><span className="kicker">04 / CONNECT</span><h2>One endpoint, two examples.</h2><p>Use the protocol request with any compliant client. The OpenAI Responses API is shown as one reference consumer, not a required runtime.</p></header>
      <div className="codePair">
        <article><header><span>MCP / VENDOR NEUTRAL</span><a href="https://modelcontextprotocol.io/specification/2026-07-28" target="_blank" rel="noreferrer">SPEC ↗</a></header><pre><code>{protocolExample}</code></pre></article>
        <article><header><span>OPENAI / REFERENCE CONSUMER</span><a href="https://platform.openai.com/docs/api-reference/responses" target="_blank" rel="noreferrer">DOCS ↗</a></header><pre><code>{openAIExample}</code></pre></article>
      </div>
      <p className="connectNote">Because every exposed tool is annotated read-only, the OpenAI example disables per-call approval. Keep approval enabled for any future tool that writes data, contacts people, changes a benchmark submission, or proposes physical execution.</p>
    </section>

    <section className="evolutionSection">
      <div className="shell">
        <header className="agentSectionHead"><span className="kicker">05 / EVOLUTION LOOP</span><h2>Change deliberately.</h2><p>A daily research review watches protocol, model, edge, and benchmark shifts. Publication still requires evidence and a human decision.</p></header>
        <div className="evolutionFlow">{["WATCH OFFICIAL SOURCES", "DIFF CAPABILITIES", "ASSESS SAFETY + COMPATIBILITY", "PROPOSE SITE CHANGE", "HUMAN REVIEW", "VERSION + PUBLISH"].map((item, index) => <span key={item}><b>{String(index + 1).padStart(2, "0")}</b>{item}</span>)}</div>
        <div className="machineLinks"><a href="/llms.txt"><b>llms.txt</b><small>model-readable guide ↗</small></a><a href="/agent.json"><b>agent.json</b><small>endpoint manifest ↗</small></a><a href="/wanted-10k/openapi.json"><b>openapi.json</b><small>benchmark API ↗</small></a><a href="/wanted-10k/spec.json"><b>spec.json</b><small>protocol contract ↗</small></a></div>
      </div>
    </section>
  </main>;
}
