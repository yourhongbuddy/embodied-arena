# Release checklist

Use this checklist for every saved Sites version and DigitalOcean iteration.

1. Keep the worktree clean and preserve unrelated user changes.
2. Run `npm run verify` against the exact source to be released.
3. Confirm `npm run verify:digitalocean` passes and `.do/app.yaml` still has `deploy_on_push: false`.
4. Create a new immutable annotated tag; never move an existing version tag.
5. Add the tag and its seven-character commit identifier to `docs/SITE-VERSIONS.md`.
6. Run `npm run verify:versions` to prove that the index and Git tag graph agree.
7. Push the branch and tags only after publication is authorized.
8. Require the GitHub **Verify repository** workflow to pass before deployment.
9. Review DigitalOcean's proposed resources and current price before creating or changing the app.
10. Deploy the exact validated branch-head commit and retain the resulting release URL.

The release-tag audit requires full Git history. GitHub Actions therefore checks out every branch and tag with `fetch-depth: 0`.
