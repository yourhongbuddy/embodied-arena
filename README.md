# Embodied Arena

Embodied Arena is a public robotics evaluation site centered on **WANTED-10K**, a rigorous longitudinal benchmark for whether people voluntarily continue living or working with a robot over as many as 10,000 resident hours.

The benchmark treats time to permanent voluntary rejection as the primary endpoint. Task performance, reliability, assistance burden, safety, privacy, learning, and service continuity remain auditable gates or diagnostics rather than hidden weights in the primary score.

## Explore

- [WANTED-10K benchmark](https://embodied-arena.chrishongap.chatgpt.site/wanted-10k)
- `/wanted-10k/protocol` — protocol and developer evidence kit
- `/wanted-10k/sdk` — reference integration adapter
- `/wanted-10k/wanted-telemetry-verifier.mjs` — zero-dependency event verifier, multi-stream aggregator, exposure reconciliation, and audit-summary handoff
- `/wanted-10k/root-commitment-witness` — independent periodic-root chronology, two-organization Ed25519 quorum, and anti-backfill contract
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
See [docs/RELEASE-CHECKLIST.md](docs/RELEASE-CHECKLIST.md) for the validated GitHub and deployment sequence.

### Reproduce any iteration

Every indexed version is a Git tag. New releases use annotated tags; the verifier preserves `digitalocean-v09` and `digitalocean-v10` as the only frozen legacy lightweight exceptions rather than rewriting history. After cloning the repository, fetch the tag graph, select an exact release, and run the same release gate used by the current branch:

```bash
git fetch --tags
git switch --detach digitalocean-v36
npm ci
npm run verify
npm run verify:versions
```

Replace `digitalocean-v36` with any tag in `docs/SITE-VERSIONS.md`. Return to active development with `git switch digitalocean`. The version audit rejects unexpected lightweight tags, changes to either frozen legacy tag type, missing or duplicate index rows, skipped version numbers, tag-to-commit mismatches, and releases that do not descend from the preceding tag in their family.

## Local development

Requires Node.js 22 or newer.

```bash
npm ci
npm run dev
```

Validate the standalone release with:

```bash
npm run verify
npm run verify:versions
```

GitHub runs both checks on pushes and pull requests targeting `digitalocean` or `sites`. The workflow has read-only repository permissions and fetches full tag history so it can prove that every indexed iteration resolves to the recorded commit.

## DigitalOcean App Platform

[![Deploy to DigitalOcean](https://www.deploytodo.com/do-btn-blue.svg)](https://cloud.digitalocean.com/apps/new?repo=https://github.com/yourhongbuddy/embodied-arena/tree/digitalocean)

Deploy the `digitalocean` branch as a **Web Service**. DigitalOcean can read the reviewable [App Platform specification](.do/app.yaml), while the button uses the separate [one-click template](.do/deploy.template.yaml). Neither file contains credentials, and automatic deployments are disabled.

| Setting | Value |
|---|---|
| Build command | `npm ci && npm run build` |
| Run command | `npm start` |
| HTTP port | `8080` |
| Route | `/` |
| Health check | `/wanted-10k` |

The generated standalone server reads DigitalOcean's `PORT` environment variable and binds publicly. The analytics endpoint is intentionally a no-storage stub on this deployment line until a production data policy and database are selected.

See [docs/DIGITALOCEAN-DEPLOYMENT.md](docs/DIGITALOCEAN-DEPLOYMENT.md) for the owner-review, cost-review, and deployment sequence.

## Evidence boundary

Synthetic manifests, templates, and local verifiers demonstrate the benchmark contracts. They are not real certifications or leaderboard entries. The official WANTED registry remains empty until independently audited field evidence passes every applicable gate.
