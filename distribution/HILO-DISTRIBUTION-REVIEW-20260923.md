# HILO distribution review — September 23, 2026

Status: research and packaging only. No listing, social publication, paid promotion, install, vote, star, or acceptance is claimed by this document.

## Current primary rules reviewed

- **OpenAI Plugins** — https://developers.openai.com/plugins/build/plugins and https://developers.openai.com/plugins/deploy/submission. A plugin can be skills-only, MCP-only, or both. Public approval leads to the universal Plugins Directory shared by ChatGPT and Codex; submission requires the appropriate organization/App Management role and review. Repo-local testing uses `.agents/plugins/marketplace.json`, so HILO now stages that marketplace separately from the legacy-compatible Claude marketplace.
- **Legacy custom GPT publishing** — https://help.openai.com/en/articles/8798878-building-and-publishing-a-gpt. Current guidance says personal Free/Go/Plus/Pro accounts cannot create or publish new GPTs and OpenAI is retiring custom GPTs in favor of Plugins. HILO therefore treats Plugins as the active path; no GPT Store listing is promised.
- **Skills.sh** — https://skills.sh/docs/faq. Directory discovery is driven by genuine installation telemetry; there is no manual directory submission. No artificial installs or ranking manipulation.
- **Claude Code marketplaces** — https://code.claude.com/docs/en/plugin-marketplaces. The repository-hosted marketplace remains a development/install surface, not an official endorsement.
- **Official MCP Registry** — https://modelcontextprotocol.io/registry/quickstart. The Registry is in preview, publishes server metadata rather than artifacts, and requires namespace authentication plus a real published server/package. HILO's skills-only plugin is not enough.
- **Rebind** — https://docs.rebind.gg/marketplace/publishing. A real Rebind script package and signed-in publishing/review flow are required; a HILO link alone is not a package.
- **Hugging Face Spaces** — https://huggingface.co/docs/hub/spaces-overview. A public Space can host a reproducible demo, but account authority, public-source implications and license review remain required. No hosting purchase is authorized.
- **Open Robotics Discourse** — https://discourse.openrobotics.org/guidelines. Browse first, use the right category, and do not spam/cross-post. No connected posting action exists in this workflow.
- **Glama** — https://glama.ai/mcp/servers. Its server directory expects GitHub-hosted MCP projects and applies quality/security checks. HILO does not yet have a verified submission-ready MCP server.
- **Agent Skill Exchange** — https://github.com/agentskillexchange/skills#submit-a-skill. It accepts pull-request or wizard submissions for skills backed by a real repo/tool/API, with 100+ words and an existing category/framework. HILO's repository is real and its skill exceeds 100 words, but owner license review remains a blocker; no PR was opened there.

## New packaging work

`.agents/plugins/marketplace.json` is a repo-local ChatGPT/Codex marketplace pointing to `./plugins/hilo-benchmark`. It is for local testing/discovery and is explicitly different from publication in the universal directory. Existing `plugin.json`, five positive and three negative submission tests, and the Claude-compatible marketplace remain unchanged.

## Distribution priorities

1. Run an actual local install smoke test in a supported ChatGPT/Codex desktop environment when that client is available; do not infer installability from JSON alone.
2. Resolve repository license, publisher identity, privacy/terms/support ownership before public submission or redistribution.
3. Keep MCP directories blocked until the existing HILO MCP route is revalidated against current Registry requirements.
4. Build a useful Rebind script or Hugging Face demo only if it adds reproducible benchmark value; do not create thin promotional wrappers.
5. Use Agent Skill Exchange only after license review; one useful PR, not broad promotional GitHub activity.

Retrieval date and rules review: 2026-09-23. Requirements can change; re-check before any external submission.
