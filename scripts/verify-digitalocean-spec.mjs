import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const APP_SPEC_PATH = new URL("../.do/app.yaml", import.meta.url);
const DEPLOY_TEMPLATE_PATH = new URL("../.do/deploy.template.yaml", import.meta.url);

const [appSpec, deployTemplate] = await Promise.all([
  readFile(APP_SPEC_PATH, "utf8"),
  readFile(DEPLOY_TEMPLATE_PATH, "utf8"),
]);

const requiredDeploymentContract = [
  "name: embodied-arena",
  "environment_slug: node-js",
  "branch: digitalocean",
  "build_command: npm ci && npm run build",
  "run_command: npm start",
  "http_port: 8080",
  "http_path: /wanted-10k",
  "prefix: /",
  "key: NODE_ENV",
  "key: VINEXT_TRUSTED_HOSTS",
  "value: production",
  "rule: DEPLOYMENT_FAILED",
];

for (const fragment of requiredDeploymentContract) {
  assert.ok(appSpec.includes(fragment), `.do/app.yaml is missing: ${fragment}`);
  assert.ok(
    deployTemplate.includes(fragment),
    `.do/deploy.template.yaml is missing: ${fragment}`,
  );
}

assert.match(
  appSpec,
  /github:\s*\n\s+repo: yourhongbuddy\/embodied-arena\s*\n\s+branch: digitalocean\s*\n\s+deploy_on_push: false/,
  ".do/app.yaml must pin the GitHub repository and disable deploy-on-push",
);
assert.match(
  deployTemplate,
  /^spec:\s*\n/,
  ".do/deploy.template.yaml must use DigitalOcean's one-click template envelope",
);
assert.ok(
  deployTemplate.includes(
    "repo_clone_url: https://github.com/yourhongbuddy/embodied-arena.git",
  ),
  ".do/deploy.template.yaml must use the public repository clone URL",
);

for (const [label, source] of [
  ["app spec", appSpec],
  ["deploy template", deployTemplate],
]) {
  assert.doesNotMatch(
    source,
    /(api[_-]?key|access[_-]?token|private[_-]?key|password)\s*:/i,
    `${label} must not contain embedded credentials`,
  );
  assert.match(
    source,
    /health_check:\s*\n\s+http_path: \/wanted-10k/,
    `${label} must health-check the public benchmark route`,
  );
}

console.log("DigitalOcean deployment specifications satisfy the repository contract.");
