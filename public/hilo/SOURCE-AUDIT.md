# HILO source audit — 2026-09-05 America/Los_Angeles

This is the dated recheck of the 12-page seed catalog. Source reading confirms page content only, not that an incident occurred, its root cause, an independent household identity, operating exposure or a fleet failure rate. Exact publication and incident dates remain unknown. Earlier September 4 draft labels must not be treated as established observation timestamps. The September 5 audit date supersedes the draft's source-check date.

| ID | Source and what is supported | Required interpretation |
|---|---|---|
| S01 | [Ecovacs T90 Pro roller-motion report](https://www.reddit.com/r/ecovacs/comments/1w0o760/ecovacs_t90_pro_mop_roller_pushes_robot_backwards/): owner describes vac-only operation but opposing motion and rear impacts while mopping textured epoxy. | Alleged mechanism, not instrumented actuator forces or independently proven property damage. Possible crossposts need deduplication; a reply is not independently verified replication. |
| S02 | [Eufy S1 Pro sudsing](https://www.reddit.com/r/eufy/comments/1vk1tzy/eufy_s1_pro_suddenly_producing_lots_of_bubbles/): owner reports foam and blockage warnings while using official cleaner. | Prior floor-cleaner residue is conjecture, not a confirmed chemical cause. |
| S03 | [Matic bag detection](https://www.reddit.com/r/MaticRobots/comments/1w2n716/matic_not_detecting_hepa_bag/): owner says included bags are not recognized; replies suggest seating/gasket checks. | Correct installation and healthy sensors have not been established. Label a suspected diagnostic lockout, not a confirmed false alarm. |
| S04 | [Narwal repeated water warning](https://www.reddit.com/r/NARWAL/comments/1vqix9b/narwal_wont_shut_up/): owner likes the robot but reports repeated water warnings and cannot find a mute option. | Inability to find a feature does not prove the feature is absent. Useful attention-budget test inspiration. |
| S05 | [Roomba 105 update discussion](https://www.reddit.com/r/roomba/comments/1w00ngu/roomba_105_update/): opening post praises a password/connectivity fix; replies include reset, remapping and connectivity problems. | Mixed observations, not one all-negative incident. Temporal association with an update is not controlled regression evidence. |
| S06 | [Dreame L60 Ultra PE brush warning](https://www.reddit.com/r/RobotVacuums/comments/1w3rj7r/my_dreame_l60_ultra_pe_hasnt_been_able_to_do_a/): owner reports a brush warning and a visible clog; clearing it did not restore cleaning. | Do not remove the real obstruction from the record or call the warning purely phantom. Personal medical details are not reproduced. |
| S07 | [Roborock Saros 10 six-month discussion](https://www.reddit.com/r/Roborock/comments/1txdwo8/saros_10_issues_6_months_in/): owner follow-up says deleting/recreating the map helped. | Supports remapping burden and state-recovery tests, not a measured map-drift rate. |
| S08 | [Matic reviewer discussion](https://www.reddit.com/r/MaticRobots/comments/1txi87c/question_from_robot_vacuum_reviewer/): a comment describes crossing a coffee-table bar and then failing to exit; a no-go workaround leaves manual cleaning. | Attribute to that comment, not all users or the original reviewer. Entry and exit need separate tests. |
| S09 | [Matic one-year discussion](https://www.reddit.com/r/MaticRobots/comments/1uqzt00/matic_review_one_year_later/): comments describe widely differing bag life. | The text discussion was read; a linked video was not acquired or fully analyzed. Household conditions and exposures are not matched. |
| S10 | [Matic battery-serviceability question](https://www.reddit.com/r/MaticRobots/comments/1w357j8/whats_the_realistic_lifespan_and_what_happens/): a prospective buyer asks about battery replacement and future support. | Not an owner failure, not evidence that service-center replacement is unavailable, and not an estimated product lifetime. |
| S11 | [Vacuum Wars Matic hands-on review](https://vacuumwars.com/matic-robot-vacuum-review/): tested configuration has strong raw cleaning alongside routing inefficiency, height limitations and wet-bag odor. | An independent test report rather than a random owner sample. Results apply to its configuration; source revision and firmware are not fixed here. |
| S12 | [Dreame L10s Ultra Gen 2 after-repair warning](https://www.reddit.com/r/Dreame_Tech/comments/1n2ok18/main_brush_is_wrapped_error_but_i_have_cleaned/): owner reports recurring brush warnings after a wheel-housing repair. | Cause and service responsibility remain unverified. This older contextual report must not be relabeled a new September 2026 event. |

## Primary dataset references checked

[DROID](https://droid-dataset.github.io/) reports 76,000 demonstration trajectories and 350 interaction hours. [Open X-Embodiment](https://robotics-transformer-x.github.io/) reports over one million trajectories across 22 embodiments. [Ego4D](https://ego4d-data.org/) describes 3,670 hours of human egocentric video. [RoboCasa365](https://robocasa.ai/) describes 365 tasks, 2,500 environments, 600+ human-demonstration hours and 1,600+ synthetic-demonstration hours in its simulation setting. These project-page counts are not HILO hours, proof of download rights, a deduplicated combined corpus or evidence of long-term autonomous coexistence.

No external dataset was downloaded, no source video was ingested, and no training permission is inferred. Review discovery, verified incident evidence, demonstrations, simulation, physical robot activity and voluntary household retention must stay separate.

## Novelty and dates

The catalog's 61 consolidated candidates come from earlier HILO discussions; 11 additions are explicitly new **design proposals**, not claims that 11 newly observed robot failures were discovered. Unknown publication timestamps stay null. One source can suggest multiple test hypotheses without becoming multiple independent incidents. A product question can motivate a repairability test without becoming a defect record.

## Website integration

The isolated research section is `/wanted-10k/failure-mining`. Existing global navigation is deliberately unchanged because its bytes are frozen into an active experiment definition. Uploading the branch or opening its pull request does not deploy this route.
