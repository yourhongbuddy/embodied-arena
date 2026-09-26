# IROS 2026 — HILO public discovery intake

Added September 26, 2026 in PR #11, branch `hilo/iros-2026-directory`.

This is a **partial conference-discovery directory**, not HILO membership, consent to contact, confirmed attendance, audited robot evidence, or a training dataset. No outreach was sent by this import. None of the people or organizations were enrolled in HILO.

## Actual imported snapshot

| Measure | Count |
|---|---:|
| Program papers in the pinned public community mirror | 1,933 |
| Author-paper appearances | 10,101 |
| Exact author-name strings in that mirror | 7,998 |
| Public name–affiliation records after supplemental roles and conservative deduplication | 8,324 |
| Supplemental workshop / industry role assertions | 150 |
| Distinct normalized names, not verified unique humans | 8,074 |
| Same-name groups requiring identity review | 219 |
| Vendor / sponsor / related organization records | 44 |
| Organizations with explicit booth evidence | 20 |
| Organizations supported by primary evidence | 35 |
| Organizations supported only by the labeled organizer-post mirror | 9 |
| Affiliation labels, not resolved organization identities | 2,164 |
| Source records including inaccessible-source disclosures | 35 |

Generated-data commit: `b7abed310545eb80761095c7d75eda13fe1318ec`. Import workflow run: `36268496237`. The workflow passed its importer tests, validated output counts and no-enrollment/contact-field constraints, rendered a Chrome preview, and committed only this intake's generated data and viewer to the isolated branch. This was not a production deployment.

## Files

- `people.jsonl` and `people.csv`: public professional name, source-stated affiliation, role, associated paper numbers, evidence class and source URLs. Exact name/affiliation matches merge; matching names across affiliation labels remain separate and flagged. Two source affiliation fields containing contact details were replaced with an unknown-affiliation placeholder.
- `organizations.jsonl` and `organizations.csv`: exhibitors, conference/workshop sponsors, competition sponsors and side-event cohosts remain distinct. A sponsor with no explicit booth has no invented booth number. A workshop sponsor is not represented as a conference-wide sponsor.
- `papers.jsonl`: factual title, paper number, author count and keywords; no copied abstracts or biographies.
- `affiliations.jsonl` / `.csv`: source-label index, not a deduplicated company registry.
- `seed.json`: reviewed supplemental public facts. `sources.json` separates primary, community-mirror and secondary evidence, with publication dates when known and retrieval dates.
- `coverage.json`: the authoritative counts and coverage limitations. `checksums.json`: generated-file hashes.
- `public/hilo/iros-2026/index.html`: a self-contained searchable browser with filtered CSV export, no tracking and no external requests except user-selected source links. It is marked noindex/nofollow. A repository copy is not proof of a live route.

## Completeness limits

The full official exhibitor floor plan disallowed automated reading. The main conference domain's crawler-policy request failed, so the primary collector did not read it. The complete official vendor roster, all workshops, keynote/committee lists and private attendee database are **not** claimed covered. The author data is a named, attributed community mirror of the official Paper & Author Index, not an organizer-provided attendance list. Eight public workshop pages and individual company/organizer announcements supplement it.

Public sources were retrieved by workflow `36267595683` (artifact `10914556783`). Policy-gated primary check `36267772224` recorded no collection because policy was unavailable. Neither restrictions nor attendee-list access were bypassed. Source snapshots are evidence for curation, not republished website code.

## Reproduction and boundaries

```bash
python3 -m unittest discover -s tools -p 'test_hilo_iros_directory.py' -v
python3 tools/hilo_iros_directory.py /path/to/reviewed-program.html --verify-raw-hash
```

The importer pins the raw public program snapshot hash and expected paper count; changed input requires review. It treats source text as data and executes no source JavaScript. CSV formula-like cells are escaped, source links must be HTTPS, and blocked sources cannot support imported assertions.

This companion registry deliberately does not change `config/hilo-growth.json`, whose targets are sites/venues rather than people. No private CRM or Gmail identity matching was performed. Existing HILO suppression and contact-history checks still apply before any future authorized contact. Official WANTED scoring, holdouts, certification, robot hours and the separate 100-job data engine are unchanged. Existing PRs #7, #8 and #10 were not modified. Follow the repository release checklist before any merge/deployment claim.
