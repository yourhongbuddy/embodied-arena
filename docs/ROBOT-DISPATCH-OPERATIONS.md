# Robot Dispatch and Ask Robot

This update was published to GitHub and deployed to DigitalOcean on September 9, 2026 after explicit approval. The trusted-host runtime setting was added to the existing app. Resource sizing and DNS records are unchanged; no database or AI credential has been added.

## Pages and addresses

- `/news`: Robot Dispatch, an original brand with an IJR-inspired topical news layout. Eight categories, headline/publisher search within the loaded feed, refresh, direct source links, and responsive layout.
- The existing DigitalOcean address `shark-app-pqh5h.ondigitalocean.app` opens the news homepage at `/`. Robot Router's main domain keeps `/studio` as its entry point.
- Set `ROBOT_DISPATCH_DOMAIN` to an owned hostname without a scheme or path to replace that default. Add and validate the hostname in the existing App Platform app, then configure its DNS with the registrar. This update does not purchase or register a domain. Keep HTTPS enabled.
- Ask Robot appears through the root layout on all rendered pages, including study pages and not-found pages. News links in the shared bar open the separate domain; localhost previews use `/news`.

The trusted-host setting is necessary behind DigitalOcean's HTTPS proxy so browser-origin checks receive the public HTTPS origin. It is now applied to the live component and included in the starter specifications. Do not replace the live app's resources with the starter specification.

## News feeds

`/api/news?topic=top` accepts only the eight listed topic identifiers. It requests headline metadata from the GDELT DOC API, with a ten-minute memory cache, coalesced duplicate requests, bounded response size, a request timeout, and a cooldown after rate limiting. Search text stays in the browser; it never becomes a provider query.

When the broad feed is unavailable and there is no previous feed, top/science/technology can show NASA's official RSS headlines with an explicit fallback notice. Other categories retain previous coverage with its original fetch timestamp or show an unavailable state. Publisher bodies and photographs are not copied. Publication dates in NASA RSS are labeled Published; GDELT timestamps are labeled Indexed. Neither feed is described as independently fact-checked.

The public provider was intermittently rate-limited during validation. The real service successfully returned ten NASA headlines through the fallback on 2026-09-07 UTC. Deployment should be followed by a live `/api/news` check; the free upstream service has no availability guarantee. Cache and cooldown are per server instance, so multiple app instances can encounter upstream limits.

Primary documentation: [GDELT DOC API](https://blog.gdeltproject.org/gdelt-doc-2-0-api-debuts/), [NASA media usage](https://www.nasa.gov/nasa-brand-center/images-and-media/).

## Activating AI answers

In the existing DigitalOcean app component, enter the following as runtime environment variables. Do not replace the whole `.do/app.yaml`: its starter component name and sizing differ from the live app.

| Setting | Value |
| --- | --- |
| `VINEXT_TRUSTED_HOSTS` | `www.getrobotrouter.com,getrobotrouter.com,shark-app-pqh5h.ondigitalocean.app`; add an owned custom news domain and its configured aliases if used |
| `OPENAI_API_KEY` | A dedicated project API key, entered as an encrypted secret in DigitalOcean; never commit or paste it into chat |
| `ASK_ROBOT_ENABLED` | `true` to activate answers; absent or any other value leaves an honest unavailable state |
| `ASK_ROBOT_MODEL` | Defaults to `gpt-5.4-mini`; use a Responses model that supports web search |
| `ASK_ROBOT_SCOPE` | `site` for robotics/site questions; otherwise general questions and news are allowed |
| `ASK_ROBOT_DAILY_LIMIT` | Default 100 calls per UTC day per running instance; maximum 500; `0` pauses paid questions |

The application uses OpenAI's Responses API with web search, at most two tool calls, 1,800 output tokens, and a 45-second request timeout. Configure provider-side project usage controls appropriate to the operator's budget before activation. The code also limits each server instance to six calls a minute and two concurrent calls. These memory counters reset on restart and multiply with replicas; they are not an account-wide spending cap. Failed calls consume the local allowance to limit repeated attempts.

Questions and at most two recent conversation turns are sent by the browser. The server accepts only question/history fields. It does not collect page contents, account information, benchmark documents, or workspace keys. The app does not log or persist conversations; `store:false` is sent to OpenAI, which does not eliminate the provider's own security retention. AI requests use a same-origin check and custom request header. Model output is rendered as escaped text, with validated clickable citations and links. No HTML supplied by the model is executed. Conversation memory clears on page reload or New chat.

Primary documentation: [OpenAI web search and citations](https://developers.openai.com/api/docs/guides/tools-web-search), [model capabilities](https://developers.openai.com/api/docs/models/gpt-5.4-mini).

## Validation and release limits

`npm run verify` includes the new `test:dispatch` suite and production HTML checks for the bar across company, tool, and study pages and the independent hostname. The AI provider is mocked in automated tests: no API credential is configured, so a real generated answer has not been tested. Browser visual/interaction QA has not been performed; the available workflow requires an explicit user request for it.

The shared bar changes the visual presentation of historical study routes. Their existing frozen presentation profile only hashes the previous six study sources, not the shared root layout. Do not treat historical study presentation equivalence as revalidated by this release or enable data collection against that profile without a new cohort/presentation baseline. The current DigitalOcean app has no analytics database and this update does not add one.

Public source publication and DigitalOcean deployment were explicitly authorized on September 9, 2026. PR #3 was merged and deployed, with the trusted-host runtime setting applied. The earlier PostgreSQL resource and registrar-access approvals remain separate; neither is needed to read news or ask AI questions. AI remains disabled until its runtime key and enable flag are configured.

Live deployment checks observed App Platform replacing the application's JSON 503 response with an HTML 504 page. The Ask Robot client checks availability before submitting an initial question and displays a readable connection message for non-JSON hosting errors. A direct API call while AI is disabled may still receive the platform's HTML error; the browser handles this without exposing a JSON parser error.
