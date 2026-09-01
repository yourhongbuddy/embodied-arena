# Release checklist

Use this checklist for every saved Sites version and DigitalOcean iteration.

1. Keep the worktree clean and preserve unrelated user changes.
2. Run `npm run verify` against the exact source to be released.
3. Create a new immutable annotated tag; never move an existing version tag.
4. Add the tag and its seven-character commit identifier to `docs/SITE-VERSIONS.md`.
5. Run `npm run verify:versions` to prove that the index and Git tag graph agree.
6. Push the branch and tags only after publication is authorized.
7. Require the GitHub **Verify repository** workflow to pass before deployment.
8. Deploy the exact validated branch-head commit and retain the resulting release URL.

The release-tag audit requires full Git history. GitHub Actions therefore checks out every branch and tag with `fetch-depth: 0`.
