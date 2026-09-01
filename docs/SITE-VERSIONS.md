# Site and deployment version index

This repository keeps platform-specific deployment work separate from the benchmark's saved Sites history.

## Branches

- `digitalocean` is the current standalone Node deployment line and GitHub default branch.
- `sites` points to the exact source used for saved Sites version 38.
- Historical versions are tags, not copied directories. This preserves the full Git history without duplicating generated files.

## Saved Sites versions

Every `sites-vNN` tag points to the exact source commit recorded for that saved Sites version.

| Version | Tag | Commit | Change |
|---:|---|---|---|
| 1 | `sites-v01` | `e91eb9a` | Launch Embodied Arena |
| 2 | `sites-v02` | `1f6ef69` | Focus homepage and add heartbeat analytics |
| 3 | `sites-v03` | `c8be22d` | Add WANTED-10K benchmark |
| 4 | `sites-v04` | `260ce71` | Harden WANTED-10K developer protocol |
| 5 | `sites-v05` | `7f100c1` | Add WANTED cohort score lab |
| 6 | `sites-v06` | `a32e2f3` | Add WANTED research basis |
| 7 | `sites-v07` | `b4193b0` | Publish WANTED protocol 0.2 kit |
| 8 | `sites-v08` | `7231b0f` | Add WANTED certification audit pack |
| 9 | `sites-v09` | `79832d3` | Ship WANTED reference adapter |
| 10 | `sites-v10` | `48e02d4` | Add WANTED longitudinal diagnostics |
| 11 | `sites-v11` | `8cddd90` | Harden WANTED score robustness |
| 12 | `sites-v12` | `2382678` | Add WANTED digital twin preflight |
| 13 | `sites-v13` | `b63bda6` | Add audited WANTED registry |
| 14 | `sites-v14` | `9af3095` | Add quantitative WANTED safety case |
| 15 | `sites-v15` | `bcfc5fc` | Correct WANTED certification applicability |
| 16 | `sites-v16` | `044c355` | Add WANTED cohort integrity profile |
| 17 | `sites-v17` | `fed3655` | Add WANTED exposure-ledger clock integrity |
| 18 | `sites-v18` | `60d39de` | Add WANTED analysis reproduction profile |
| 19 | `sites-v19` | `8260b00` | Add WANTED telemetry authenticity profile |
| 20 | `sites-v20` | `bfe6c0c` | Add WANTED independent audit seal |
| 21 | `sites-v21` | `b68c8f6` | Add WANTED auditor credential trust chain |
| 22 | `sites-v22` | `0b972d5` | Ship standalone WANTED audit verifier SDK |
| 23 | `sites-v23` | `6798a76` | Add rigorous WANTED seven-day withdrawal profile |
| 24 | `sites-v24` | `4df5db8` | Add auditable WANTED human-measures profile |
| 25 | `sites-v25` | `cfe2809` | Add revealed-preference reservation-value profile |
| 26 | `sites-v26` | `ecd6b53` | Add matched WANTED learning and generalization profile |
| 27 | `sites-v27` | `3452bff` | Add auditable assistance and rescue integrity |
| 28 | `sites-v28` | `cf68994` | Add auditable policy-evolution integrity |
| 29 | `sites-v29` | `78fb0b6` | Add HILO Realtime protocol page |
| 30 | `sites-v30` | `aa381ac` | Add executable HILO Realtime benchmark profile |
| 31 | `sites-v31` | `28e63e2` | Add privacy and consent integrity gate |
| 32 | `sites-v32` | `e71bfef` | Add service-continuity integrity gate |
| 33 | `sites-v33` | `231f16b` | Add endpoint-adjudication integrity gate |
| 34 | `sites-v34` | `aa804fd` | Expose endpoint adjudication across operator workflows |
| 35 | `sites-v35` | `4096a4d` | Add preregistration integrity profile |
| 36 | `sites-v36` | `94c1c75` | Add protocol-deviation integrity profile |
| 37 | `sites-v37` | `afbc365` | Expose benchmark evidence profiles in OpenAPI |
| 38 | `sites-v38` | `05c24ce` | Add prospective sampling and stopping integrity |

## DigitalOcean iterations

| Version | Tag | Commit | Change |
|---:|---|---|---|
| 1 | `digitalocean-v01` | `0736eda` | Prepare Embodied Arena for DigitalOcean |
| 2 | `digitalocean-v02` | `07ec6e4` | Expand robot rankings with Jetson edge platforms |
| 3 | `digitalocean-v03` | `87a254b` | Add the read-only agent and MCP interface |
| 4 | `digitalocean-v04` | `b2aa8c2` | Validate the standalone deployment end to end |

## Release convention

1. Keep benchmark changes platform-neutral whenever possible.
2. Save a Sites version from an exact validated commit, then tag that commit `sites-vNN`.
3. Keep DigitalOcean runtime adaptations on `digitalocean`, then tag meaningful deployment milestones `digitalocean-vNN`.
4. Never commit `dist/`, dependency directories, credentials, environment files, or generated release archives.
5. Use a new tag for every published iteration. Do not move or overwrite historical tags.
