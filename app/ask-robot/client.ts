import type { RobotAnswer } from "./service.ts";

const activationMessage = "Ask Robot is awaiting activation. Please use the site links below or contact privacy@getrobotrouter.com.";
const connectionMessage = "Robot couldn’t connect. Please try again shortly.";

export async function requestAnswer(body: { question: string; history: { role: string; content: string }[] }, options: { signal: AbortSignal; available: boolean | null; fetcher?: typeof fetch }) {
  const fetcher = options.fetcher ?? fetch;
  if (options.available === false) throw new Error(activationMessage);
  if (options.available === null) {
    const status = await fetcher("/api/ask-robot", { signal: options.signal });
    const configuration = await status.json().catch(() => null);
    if (!status.ok || typeof configuration?.available !== "boolean") throw new Error(connectionMessage);
    if (!configuration.available) throw new Error(activationMessage);
  }
  const response = await fetcher("/api/ask-robot", { method: "POST", headers: { "Content-Type": "application/json", "X-RobotRouter-Request": "ask" }, body: JSON.stringify(body), signal: options.signal });
  // Hosting gateways can replace JSON errors with an HTML error page.
  const result = await response.json().catch(() => null);
  if (!response.ok || !result) throw new Error(typeof result?.error === "string" ? result.error : connectionMessage);
  return result as RobotAnswer;
}
