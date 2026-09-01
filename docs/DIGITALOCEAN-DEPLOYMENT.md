# DigitalOcean App Platform deployment

The repository contains two equivalent, reviewable deployment definitions:

- `.do/app.yaml` is the App Platform specification used when importing the GitHub repository.
- `.do/deploy.template.yaml` powers DigitalOcean's one-click deployment flow.

Both definitions build the locked dependencies, start the standalone server on DigitalOcean's injected port, route all traffic to the site, and check `/wanted-10k` for service health. They contain no credentials. Automatic deploys are disabled in the repository-connected specification so a branch update cannot publish itself.

## Before the first deployment

1. Publish the `digitalocean` branch to `yourhongbuddy/embodied-arena` only after the repository owner approves it.
2. Confirm the GitHub **Verify repository** check passes for the exact branch-head commit.
3. Review DigitalOcean's resource and price summary before creating the app.
4. Keep the default analytics no-storage behavior unless a production data policy and database have been approved.

## One-click path

Use the **Deploy to DigitalOcean** button in the repository README. DigitalOcean reads `.do/deploy.template.yaml`, presents the proposed resources for review, and does not create them until the account owner confirms the deployment.

## Repository import path

1. In DigitalOcean, choose **Create → App Platform → GitHub**.
2. Select `yourhongbuddy/embodied-arena` and the `digitalocean` branch.
3. Choose `.do/app.yaml` as the App Spec if DigitalOcean does not detect it automatically.
4. Review the service, region, instance size, build and run commands, route, health check, and estimated monthly cost.
5. Create the resources, then wait for `/wanted-10k` to report healthy.

## Release discipline

For later releases, validate and tag the exact source, update `docs/SITE-VERSIONS.md`, push the branch and tags with approval, require the GitHub verification workflow to pass, and deploy that exact commit from DigitalOcean. Do not enable deploy-on-push unless the release policy is intentionally changed.
