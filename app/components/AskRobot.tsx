"use client";
import { Fragment, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import type { AnswerPart, RobotAnswer } from "../ask-robot/service";
import { publicLink } from "../news/catalog";
import "./ask-robot.css";

type Turn = { question: string; answer: RobotAnswer };
function linkedText(text: string): ReactNode[] {
  const result: ReactNode[] = []; const pattern = /\[([^\]\n]{1,200})\]\(([^\s)]{1,2048})\)/g; let cursor = 0;
  for (const match of text.matchAll(pattern)) {
    result.push(text.slice(cursor, match.index));
    const internal = /^\/(studio|leaderboard|news|watch|about|contact|privacy|terms)\/?$/.test(match[2]); const href = internal ? match[2] : publicLink(match[2]);
    result.push(href ? <a key={match.index} href={href} {...(internal ? {} : { target: "_blank", rel: "noopener noreferrer" })}>{match[1]}</a> : match[1]); cursor = match.index! + match[0].length;
  }
  result.push(text.slice(cursor)); return result;
}
function AnswerText({ part }: { part: AnswerPart }) {
  const nodes: ReactNode[] = []; let cursor = 0;
  part.citations.forEach((citation, index) => {
    if (citation.start < cursor) return;
    nodes.push(<Fragment key={`text-${index}`}>{linkedText(part.text.slice(cursor, citation.start))}</Fragment>);
    nodes.push(<a className="askCitation" key={`cite-${index}`} href={citation.url} target="_blank" rel="noopener noreferrer" title={citation.title}>[{index + 1}: {new URL(citation.url).hostname.replace(/^www\./, "")}]</a>); cursor = citation.end;
  });
  nodes.push(<Fragment key="end">{linkedText(part.text.slice(cursor))}</Fragment>);
  return <div className="askAnswerText">{nodes}</div>;
}
export function AskRobot({ newsHref = "/news" }: { newsHref?: string }) {
  const [open, setOpen] = useState(false); const [question, setQuestion] = useState(""); const [turns, setTurns] = useState<Turn[]>([]);
  const [pending, setPending] = useState(""); const [error, setError] = useState(""); const [available, setAvailable] = useState<boolean | null>(null);
  const input = useRef<HTMLInputElement>(null); const toggle = useRef<HTMLButtonElement>(null); const scroll = useRef<HTMLDivElement>(null); const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    if (!open) return;
    function escape(event: KeyboardEvent) { if (event.key === "Escape") { setOpen(false); toggle.current?.focus(); } }
    document.addEventListener("keydown", escape); return () => document.removeEventListener("keydown", escape);
  }, [open]);
  useEffect(() => { if (open) scroll.current?.scrollTo({ top: scroll.current.scrollHeight, behavior: "instant" }); }, [open, turns, pending, error]);
  useEffect(() => {
    if (!open) return; const abort = new AbortController();
    fetch("/api/ask-robot", { signal: abort.signal }).then(response => response.json()).then(status => setAvailable(status.available === true)).catch(() => {});
    return () => abort.abort();
  }, [open]);
  async function ask(event: FormEvent) {
    event.preventDefault(); const text = question.trim(); if (!text || pending) return;
    setOpen(true); setError(""); setPending(text); const abort = new AbortController(); controller.current = abort;
    try {
      const history = turns.slice(-2).flatMap(turn => [{ role: "user", content: turn.question }, { role: "assistant", content: turn.answer.parts.map(part => part.text).join("\n").slice(0, 3000) }]);
      const response = await fetch("/api/ask-robot", { method: "POST", headers: { "Content-Type": "application/json", "X-RobotRouter-Request": "ask" }, body: JSON.stringify({ question: text, history }), signal: abort.signal });
      const result = await response.json(); if (!response.ok) throw new Error(result.error || "Robot couldn’t answer. Please try again.");
      setTurns(items => [...items.slice(-9), { question: text, answer: result as RobotAnswer }]); setQuestion(""); setAvailable(true);
    } catch (failure) { if (!abort.signal.aborted) setError(failure instanceof Error ? failure.message : "Robot couldn’t connect. Please try again."); }
    finally { setPending(""); controller.current = null; input.current?.focus(); }
  }
  function close() { setOpen(false); toggle.current?.focus(); }
  return <><div className="askRobotSpace" aria-hidden="true" /><div className="askRobot">
    {open && <section className="askPanel" id="ask-panel" role="dialog" aria-labelledby="ask-panel-title"><header><div><span className="askSpark" aria-hidden="true">✳</span><h2 id="ask-panel-title">Ask Robot <small>AI assistant</small></h2></div><div><button type="button" disabled={Boolean(pending)} onClick={() => { setTurns([]); setError(""); setQuestion(""); input.current?.focus(); }}>New chat</button><button type="button" onClick={close} aria-label="Close Ask Robot">✕</button></div></header>
      <div className="askConversation" ref={scroll} aria-live="polite" aria-relevant="additions text">
        {!turns.length && !pending && <div className="askWelcome"><p className="askKicker">A QUESTION IS A GOOD START.</p><h3>What’s on your mind?</h3><p>Explore the news, understand a benchmark, or find your way around Robot Router.</p><div>{["How do I create a benchmark?", "How should I compare AI models?", "What happened in robotics this week?"].map(prompt => <button type="button" key={prompt} onClick={() => { setQuestion(prompt); input.current?.focus(); }}>{prompt} <span>↗</span></button>)}</div></div>}
        {available === false && <p className="askSetupNotice">AI answers are awaiting activation. You can explore <a href="/news">the news desk</a> or <a href="/studio">Benchmark Studio</a>.</p>}
        {turns.map((turn, index) => <div className="askTurn" key={index}><p className="askQuestion">{turn.question}</p><div className="askAnswer"><strong>ROBOT</strong>{turn.answer.parts.map((part, number) => <AnswerText part={part} key={number} />)}{turn.answer.incomplete && <p className="askSetupNotice">This answer stopped early. Ask a shorter follow-up for more detail.</p>}</div></div>)}
        {pending && <div className="askTurn"><p className="askQuestion">{pending}</p><p className="askThinking" role="status">Robot is thinking… <button type="button" onClick={() => controller.current?.abort()}>Stop</button></p></div>}
        {error && <p className="askError" role="alert">{error}</p>}
      </div>
      <p className="askPrivacy"><a href={newsHref} target={newsHref.startsWith("https:") ? "_blank" : undefined} rel="noopener noreferrer">Robot Dispatch ↗</a> · <a href="/studio">Benchmark Studio</a><br />Questions and recent messages go to OpenAI. Page contents and private benchmarks are not sent automatically. AI can make mistakes. <a href="/privacy">Privacy</a></p>
    </section>}
    <div className="askDock"><button ref={toggle} className="askToggle" type="button" aria-expanded={open} aria-controls={open ? "ask-panel" : undefined} onClick={() => { if (open) close(); else { setOpen(true); input.current?.focus(); } }}><span aria-hidden="true">✳</span><strong>Ask Robot</strong><span className="askAiLabel">AI</span></button><form onSubmit={ask}><label htmlFor="ask-robot-question" className="askSrOnly">Ask Robot a question</label><input ref={input} id="ask-robot-question" value={question} onFocus={() => setOpen(true)} onChange={event => setQuestion(event.target.value)} maxLength={2000} placeholder="Ask a question…" autoComplete="off" disabled={Boolean(pending)} aria-describedby="ask-send-notice" /><button type="submit" disabled={!question.trim() || Boolean(pending)} aria-label="Send question to Ask Robot">↑</button></form><a className="askNewsLink" href={newsHref} target={newsHref.startsWith("https:") ? "_blank" : undefined} rel="noopener noreferrer">News ↗</a></div>
    <p id="ask-send-notice" className="askSrOnly">Sending shares your question and recent chat messages with OpenAI. Do not include sensitive information.</p>
  </div></>;
}
