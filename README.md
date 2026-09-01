# Embodied Arena

Embodied Arena is a public robotics evaluation site centered on **WANTED-10K**, a rigorous longitudinal benchmark for whether people voluntarily continue living or working with a robot over as many as 10,000 resident hours.

The benchmark treats time to permanent voluntary rejection as the primary endpoint. Task performance, reliability, assistance burden, safety, privacy, learning, and service continuity remain auditable gates or diagnostics rather than hidden weights in the primary score.

## Explore

- [WANTED-10K benchmark](https://embodied-arena.chrishongap.chatgpt.site/wanted-10k)
- `/wanted-10k/protocol` — protocol and developer evidence kit
- `/wanted-10k/sdk` — reference integration adapter
- `/wanted-10k/certification` — certification levels and applicability
- `/wanted-10k/leaderboard` — audited registry and ranking rules
- `/leaderboard` — broader embodied-robot rankings
- `/agents` — read-only agent and MCP integration guide
- `/atlas` — robot and platform landscape

## Repository organization

| Ref | Purpose |
|---|---|
| `digitalocean` | Current standalone Node deployment line and GitHub default branch |
| `sites` | Exact source of the latest saved OpenAI Sites version |
| `sites-v01` … `sites-v38` | Immutable source snapshots for every saved Sites iteration |
| `digitalocean-v01` … | Immutable DigitalOcean-specific deployment iterations |

See [docs/SITE-VERSIONS.md](docs/SITE-VERSIONS.md) for the complete version-to-commit index and maintenance convention.

## Local development

Requires Node.js 22 or newer.

```bash
npm ci
npm run dev
```

Validate the standalone release with:

```bash
npm run build
npm start
```

## DigitalOcean App Platform

Deploy the `digitalocean` branch as a **Web Service**.

| Setting | Value |
|---|---|
| Build command | `npm run build` |
| Run command | `npm start` |
| HTTP port | `8080` |
| Route | `/` |
| Health check | `/wanted-10k` |

The generated standalone server reads DigitalOcean's `PORT` environment variable and binds publicly. The analytics endpoint is intentionally a no-storage stub on this deployment line until a production data policy and database are selected.

## Evidence boundary

Synthetic manifests, templates, and local verifiers demonstrate the benchmark contracts. They are not real certifications or leaderboard entries. The official WANTED registry remains empty until independently audited field evidence passes every applicable gate.
