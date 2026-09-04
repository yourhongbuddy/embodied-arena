"use client";

import { useState } from "react";
import { SiteNav } from "../components/SiteNav";
import { track } from "../components/AnalyticsHeartbeat";
import "./campaigns.css";

type DraftStatus = "draft" | "approved";

const channels = [
  { id: "email", mark: "EM", name: "Email campaign agent", focus: "Opt-in newsletter + partner outreach", cadence: "2 sends / week", guardrail: "Consent + unsubscribe required", accent: "email" },
  { id: "x", mark: "X", name: "X campaign agent", focus: "Research threads + benchmark releases", cadence: "1–2 posts / day", guardrail: "One disclosed brand account", accent: "x" },
  { id: "instagram", mark: "IG", name: "Instagram campaign agent", focus: "Carousels + lab visual stories", cadence: "3 posts / week", guardrail: "Original or licensed media", accent: "instagram" },
  { id: "tiktok", mark: "TT", name: "TikTok campaign agent", focus: "Short benchmark explainers", cadence: "3 videos / week", guardrail: "No synthetic engagement", accent: "tiktok" },
] as const;

const drafts = [
  { id: "x-hilo", channel: "X", day: "MON 09:00", title: "A robot can finish the task and still fail the operator.", detail: "Six-post thread introducing Human Burden and MTHI with one benchmark chart.", objective: "Protocol awareness" },
  { id: "email-operator", channel: "EMAIL", day: "TUE 08:30", title: "The 95% success-rate trap", detail: "Operator briefing: compare completion rate with interventions, recovery time, and supervision load.", objective: "Newsletter sign-ups" },
  { id: "ig-loop", channel: "INSTAGRAM", day: "WED 11:00", title: "One trace. Two control planes.", detail: "Seven-panel carousel explaining the agent proposal and independent safety-kernel boundary.", objective: "Saves + shares" },
  { id: "tt-camera", channel: "TIKTOK", day: "THU 15:00", title: "Why robot video is not one continuous prompt", detail: "Thirty-second storyboard showing camera frames becoming timestamped image events.", objective: "Qualified visits" },
  { id: "x-jetson", channel: "X", day: "FRI 09:00", title: "Jetson is the compute layer—not the robot model.", detail: "Comparison card separating edge hardware, runtime, policy, embodiment, and safety envelope.", objective: "Developer reach" },
] as const;

const workflow = [
  ["01", "Listen", "Read approved first-party releases, benchmark changes, and campaign goals."],
  ["02", "Draft", "Create channel-native copy with source links, alt text, and asset notes."],
  ["03", "Review", "Check claims, consent, rights, tone, duplication, and platform constraints."],
  ["04", "Approve", "A named human accepts the exact message, audience, channel, and time."],
  ["05", "Publish", "An authorized platform connection sends only the approved payload."],
  ["06", "Learn", "Aggregate outcomes inform the next brief without profiling individuals."],
] as const;

export default function Campaigns() {
  const [statuses, setStatuses] = useState<Record<string, DraftStatus>>({});
  const [paused, setPaused] = useState(false);
  const approvedCount = drafts.filter((draft) => statuses[draft.id] === "approved").length;

  function toggleApproval(id: string) {
    const nextStatus: DraftStatus = statuses[id] === "approved" ? "draft" : "approved";
    setStatuses((current) => ({ ...current, [id]: nextStatus }));
    track("campaign_reviewed", "/campaigns", { campaign: id, status: nextStatus });
  }

  return <main className="campaignPage">
    <SiteNav />
    <section className="campaignHeader shell">
      <div>
        <span className="kicker">CAMPAIGN CONTROL / HUMAN APPROVAL REQUIRED</span>
        <h1>One voice.<br/><em>Four channels.</em></h1>
        <p>A review-first agent team for Embodied Arena. It turns verified benchmark work into useful, channel-native campaigns while keeping identity, consent, claims, and publishing under human control.</p>
      </div>
      <aside className="campaignControl" aria-label="Campaign control status">
        <header><span><i className={paused ? "paused" : ""}/>{paused ? "ALL AGENTS PAUSED" : "DRAFT MODE ACTIVE"}</span><b>NO AUTO-PUBLISH</b></header>
        <div className="campaignControlStats">
          <div><b>4</b><span>SPECIALIST AGENTS</span></div>
          <div><b>{approvedCount}/{drafts.length}</b><span>DRAFTS APPROVED</span></div>
          <div><b>0</b><span>ACCOUNTS CONNECTED</span></div>
        </div>
        <button type="button" onClick={() => setPaused((value) => !value)}>{paused ? "Resume drafting" : "Pause every agent"}</button>
      </aside>
    </section>

    <section className="campaignWorkspace shell">
      <header className="campaignSectionHead">
        <div><span className="kicker">01 / CHANNEL ROSTER</span><h2>Specialists, not sockpuppets.</h2></div>
        <p>The system supports one authenticated, disclosed brand account per social network and a consented email audience. Team seats can collaborate behind those identities; account farms cannot.</p>
      </header>
      <div className="channelGrid">
        {channels.map((channel) => <article className={`channelCard ${channel.accent}`} key={channel.id}>
          <header><span>{channel.mark}</span><i>NOT CONNECTED</i></header>
          <h3>{channel.name}</h3><p>{channel.focus}</p>
          <dl><div><dt>CADENCE CAP</dt><dd>{channel.cadence}</dd></div><div><dt>IDENTITY RULE</dt><dd>{channel.guardrail}</dd></div></dl>
          <button type="button" disabled aria-label={`${channel.name} connection unavailable`}>Connect authorized account</button>
        </article>)}
      </div>
      <div className="identityRule"><b>100-ACCOUNT REQUEST BLOCKED</b><p>Creating or coordinating 100 X, Instagram, or TikTok identities would enable spam and inauthentic amplification. The compliant alternative is one verified brand presence per network, supported by role-based team access, paid campaigns through official ad tools, and genuine creator partnerships.</p><span>ENFORCED BY CAMPAIGN POLICY</span></div>
    </section>

    <section className="campaignQueueSection">
      <div className="shell">
        <header className="campaignSectionHead light">
          <div><span className="kicker">02 / REVIEW QUEUE</span><h2>Approve the message,<br/>never the machinery.</h2></div>
          <p>Approval applies to one exact payload. Any material edit, audience change, new channel, or reschedule returns it to draft.</p>
        </header>
        <div className="campaignQueue">
          <header><span>CHANNEL</span><span>SCHEDULE</span><span>DRAFT</span><span>OBJECTIVE</span><span>DECISION</span></header>
          {drafts.map((draft) => {
            const approved = statuses[draft.id] === "approved";
            return <article key={draft.id}><b>{draft.channel}</b><time>{draft.day}</time><div><strong>{draft.title}</strong><small>{draft.detail}</small></div><span>{draft.objective}</span><button type="button" className={approved ? "approved" : ""} onClick={() => toggleApproval(draft.id)}>{approved ? "APPROVED" : "REVIEW"}</button></article>;
          })}
        </div>
        <p className="queueFootnote">This prototype stores review choices only in the current browser session and sends nothing. Production publishing requires official platform connections, protected credentials, an audit log, and a named approver.</p>
      </div>
    </section>

    <section className="campaignWorkflow shell">
      <header className="campaignSectionHead"><div><span className="kicker">03 / OPERATING CONTRACT</span><h2>A bounded agent loop.</h2></div><p>Every handoff is visible, attributable, and reversible until the approved publish step.</p></header>
      <div className="workflowGrid">{workflow.map(([number, name, description]) => <article key={number}><span>{number}</span><h3>{name}</h3><p>{description}</p></article>)}</div>
      <div className="campaignGuardrails">
        <article><span>ALWAYS</span><h3>Evidence beside the claim</h3><p>Every benchmark statement retains its source, evaluation context, model layer, and public-beta caveat.</p></article>
        <article><span>NEVER</span><h3>Manufactured consensus</h3><p>No fake personas, coordinated replies, undisclosed bots, purchased engagement, scraping of private contacts, or unsolicited bulk outreach.</p></article>
        <article><span>ESCALATE</span><h3>People and safety claims</h3><p>Claims about a company, person, incident, or physical safety outcome require a second reviewer before scheduling.</p></article>
      </div>
    </section>

    <section className="campaignConnect"><div className="shell">
      <span className="kicker">04 / CONNECTION PLAN</span><h2>Credentials stay out of the agent.</h2>
      <p>Connect official APIs through encrypted server-side secrets. Give each publisher the narrowest scope, short-lived access where supported, platform rate limits, a global pause control, and a complete approval-and-delivery audit trail.</p>
      <div><span><b>01</b>Verify brand identity</span><span><b>02</b>Connect official APIs</span><span><b>03</b>Import consented audience</span><span><b>04</b>Name human approvers</span><span><b>05</b>Send test campaign</span></div>
    </div></section>
  </main>;
}
