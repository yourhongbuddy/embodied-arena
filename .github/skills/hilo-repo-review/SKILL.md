---
name: hilo-repo-review
description: Review synthetic HILO/WANTED-10K evidence, telemetry integrity, and protocol claims in this repository without inventing field observations or changing frozen scores.
---

# HILO repository evidence review

This is a **repository-local review skill**, not a published marketplace listing, a robot controller, or a certification service. HILO / RobotRouter is independent; do not claim university, manufacturer or OpenAI affiliation.

## Review procedure

1. Read `plugins/hilo-benchmark/skills/hilo-audit/SKILL.md`, the current pinned WANTED protocol, `docs/HILO-SOURCE-ADMISSION.md` (on the data-engine branch when applicable), and relevant source at the commit actually under review. Never substitute a proposal for the canonical score or a staged source for admitted evidence.
2. Identify the evidence class: expressly synthetic example, simulation, demonstration, independently recorded robot field observation, human review, or external public report. Preserve participant consent, bystander privacy, stop authority, incidents, holdouts, and cohort separation.
3. For **only the repository's supplied synthetic fixture**, a developer may run:
   `python tools/hilo_synthetic_preflight.py tools/hilo_synthetic_fixture.json`
   Inspect the returned exit status and actual output. Do not run this preflight on real household logs, private recordings, uploaded home videos, or participant identifiers. No file, network or credential access is granted by this skill.
4. Inspect event IDs, full UTC timestamps, six illustrative event classes and explicit intervention seconds. Do not interpret a successful **non-normative** preflight as field hours, accepted human keep votes, normative protocol conformance, or safety certification.
5. When proposing code or an integration, require reproducible regression tests, narrow scope, and the repository release checklist. Never auto-merge, change DNS, restart production, deploy, post advertisements, spend on APIs, or enable model dispatch.

## Output boundary

Report exact reviewed file/commit, executed commands and results (or **not run**), supported evidence class and horizon, unresolved issues, and next human review step. Never infer user adoption, conversions, or field validation from source presence, queue slots, synthetic fixtures or instructions.

## Publication status

This skill is meant for **in-repository** GitHub Copilot discovery only after review/merge. Public marketplace or reusable-skill publication requires separate identity, licensing, authentic install and policy checks. There are no claimed installations or external submissions.
